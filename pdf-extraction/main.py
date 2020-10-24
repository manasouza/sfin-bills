import json
import locale
import os
import re
from datetime import datetime, timedelta, timezone

import gspread
from google.cloud import storage
from google.cloud import vision
from google.oauth2.service_account import Credentials
from google.protobuf import json_format

CONTENT_TYPE = 'application/pdf'

SPREADSHEET_ID = os.getenv('spreadsheet')
CATEGORY_COLUMN = os.getenv('category_column')
SPREADSHEET_TAB = os.getenv('worksheet')

ROOT_BUCKET = 'sfinbills-pdfs'
GCS_DESTINATION_URI = 'gs://{}/output/'.format(ROOT_BUCKET)
BILL_FULL_PATH = 'gs://{}/{}'

SHEETS_API_SCOPE = ['https://spreadsheets.google.com/feeds',
                    'https://www.googleapis.com/auth/drive']

storage_client = storage.Client()
vision_client = vision.ImageAnnotatorClient()

locale.setlocale(locale.LC_TIME, "pt_BR.utf8")

bills = ['Água', 'Luz']


def process_all_bills(request):
    # data = base64.b64decode(event['data']).decode('utf-8')
    # payload = json.loads(data)

    bucket = storage_client.get_bucket(ROOT_BUCKET)
    most_recent_bill = _get_most_recent_bill(bucket)
    detected_category = _retrieve_bill_category(most_recent_bill)

    # VISION API
    # Supported mime_types are: 'application/pdf' and 'image/tiff'
    send_bill_file_and_set_output(BILL_FULL_PATH.format(ROOT_BUCKET, most_recent_bill), GCS_DESTINATION_URI)

    # Once the request has completed and the output has been  written to GCS, we can list all the output files.
    bill_content = get_bill_content(GCS_DESTINATION_URI)
    bill_value = _retrieve_bill_value(bill_content, detected_category)

    _update_bill_value_in_spreadsheet(bill_value, detected_category)


def _update_bill_value_in_spreadsheet(bill_value, detected_category):
    # get credentials for spreadsheet
    creds_key_json = _get_auth_key()
    # update Spreadsheet values
    main_worksheet = get_spreadsheet(creds_key_json)
    update_row = _get_spreadsheet_row_to_update(CATEGORY_COLUMN, detected_category, main_worksheet)
    update_column = _get_spreadsheet_column_to_update(main_worksheet)
    main_worksheet.update_cell(update_row, update_column, bill_value)


def process_new_bill_upload(event, context):
    print(event)
    print('--------------------------------')
    print(context)
    new_bill = event['name']
    print('new bill uploaded: %s', new_bill)
    detected_category = _retrieve_bill_category(new_bill)
    # VISION API
    # Supported mime_types are: 'application/pdf' and 'image/tiff'
    send_bill_file_and_set_output(BILL_FULL_PATH.format(ROOT_BUCKET, new_bill), GCS_DESTINATION_URI)
    # Once the request has completed and the output has been  written to GCS, we can list all the output files.
    bill_content = get_bill_content(GCS_DESTINATION_URI)
    bill_value = _retrieve_bill_value(bill_content, detected_category)
    _update_bill_value_in_spreadsheet(bill_value, detected_category)


def _get_spreadsheet_column_to_update(main_worksheet):
    current_month = datetime.today().strftime("%B/%Y")
    print('current month: %s', current_month)
    for header_cell in main_worksheet.range(1, 1, 3, main_worksheet.col_count):
        if header_cell.value.lower() == current_month:
            update_column = header_cell.col
            print('update column found: ' + str(update_column))
    return update_column


def _get_spreadsheet_row_to_update(category_column, detected_category, worksheet):
    for category_cell in worksheet.range(1, category_column, worksheet.row_count, category_column):
        if category_cell.value == detected_category:
            update_row = category_cell.row
            print('update row found: ' + str(update_row))
    return update_row


def _in_sub_folder(bucket_object_name):
    return '/' in bucket_object_name


def _get_most_recent_bill(bucket, most_recent_bill=None):
    most_recent_date_created = datetime.now(tz=timezone.utc) - timedelta(days=7)
    for pdf_file in [file for file in bucket.list_blobs() if file.content_type == CONTENT_TYPE]:
        print(str(pdf_file) + " / " + str(pdf_file.time_created))
        if not _in_sub_folder(pdf_file.name) and pdf_file.time_created > most_recent_date_created:
            most_recent_bill = pdf_file.name
            most_recent_date_created = pdf_file.time_created
    return most_recent_bill


def get_spreadsheet(creds_key_json):
    credentials = Credentials.from_service_account_info(
        creds_key_json,
        scopes=SHEETS_API_SCOPE
    )
    gc = gspread.authorize(credentials)
    main_worksheet = gc.open_by_key(SPREADSHEET_ID).worksheet(SPREADSHEET_TAB)
    return main_worksheet


def get_bill_content(gcs_destination_uri):
    # Once the request has completed and the output has been
    # written to GCS, we can list all the output files.
    match = re.match(r'gs://([^/]+)/(.+)', gcs_destination_uri)
    bucket_name = match.group(1)
    prefix = match.group(2)

    bucket = storage_client.get_bucket(bucket_name)
    # List objects with the given prefix.
    blob_list = list(bucket.list_blobs(prefix=prefix))
    print('output files:')
    for blob in blob_list:
        print(blob.name)

    # Process the first output file from GCS.
    # Since we specified batch_size=2, the first response contains
    # the first two pages of the input file.
    output = blob_list[0]

    json_string = output.download_as_string()
    response = json_format.Parse(
        json_string, vision.types.AnnotateFileResponse())

    # The actual response for the first page of the input file.
    first_page_response = response.responses[0]
    annotation = first_page_response.full_text_annotation

    # Here we print the full text from the first page.
    # The response contains more information:
    # annotation/pages/blocks/paragraphs/words/symbols
    # including confidence scores and bounding boxes

    print(u'Full text:\n{}'.format(
        annotation.text))
    return annotation.text


def send_bill_file_and_set_output(gcs_source_uri, gcs_destination_uri):
    # Supported mime_types are: 'application/pdf' and 'image/tiff'
    # mime_type = CONTENT_TYPE
    # How many pages should be grouped into each json output file.
    batch_size = 2

    feature = vision.types.Feature(
        type=vision.enums.Feature.Type.DOCUMENT_TEXT_DETECTION)

    gcs_source = vision.types.GcsSource(uri=gcs_source_uri)
    input_config = vision.types.InputConfig(
        gcs_source=gcs_source, mime_type=CONTENT_TYPE)

    gcs_destination = vision.types.GcsDestination(uri=gcs_destination_uri)
    output_config = vision.types.OutputConfig(
        gcs_destination=gcs_destination, batch_size=batch_size)

    async_request = vision.types.AsyncAnnotateFileRequest(
        features=[feature], input_config=input_config,
        output_config=output_config)

    operation = vision_client.async_batch_annotate_files(
        requests=[async_request])

    print('Waiting for the operation to finish...')
    operation.result(timeout=420)


def _get_auth_key():
    # TODO: add as env var
    sa_name = 'SmartFinance-Bills-Beta-eb6d6507173d.json'
    sa_bucket = 'sfinbills'
    bucket = storage_client.get_bucket(sa_bucket)
    # List objects with the given prefix.
    for index, blob in enumerate(bucket.list_blobs()):
        print(blob.name)
        if blob.name == sa_name:
            creds = blob.download_as_string()
            json_acct_info = json.loads(creds)
    return json_acct_info


def _get_for_agua(pdf_file=None):
    return pdf_file.startswith('RFATURA_DIR_FR2FAT16')


def _get_for_luz(pdf_file=None):
    return re.search('boleto_[\d\s]+', pdf_file)


def _retrieve_bill_category(pdf_file):
    if pdf_file.startswith('RFATURA_DIR_FR2FAT16'):
        return 'Água'
    elif re.search('boleto_[\d\s]+', pdf_file):
        return 'Luz'
    else:
        raise NotImplementedError


def _retrieve_bill_value(bill_content, category):
    if category == 'Água':
        value = re.search('TOTAL\nR\$\n(.*)', bill_content).group(1)
        return value
    elif category == 'Luz':
        value = re.search('TOTAL A PAGAR \(R\$\)\n(.*)\n', bill_content).group(1)
        return value
    else:
        raise NotImplementedError