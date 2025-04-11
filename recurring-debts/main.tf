terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "6.29.0"
    }
  }
}

provider "google" {
  project = "smartfinancebills"
  region  = "us-west1"
  zone    = "us-west1-a"
}


# PubSub
resource "google_pubsub_topic" "trigger-montly-expenses" {
  name = "trigger-montly-expenses"
}
# IAM
resource "google_pubsub_topic_iam_binding" "binding" {
  project = google_pubsub_topic.trigger-montly-expenses.project
  topic = google_pubsub_topic.trigger-montly-expenses.name
  role = "roles/pubsub.editor"
  members = [
    "allUsers",
  ]
}

# Functions
resource "google_storage_bucket" "bucket" {
  name     = "montly-expenses-gcfv2-source"  # Every bucket name must be globally unique
  location = "US"
  uniform_bucket_level_access = true
}
resource "google_storage_bucket_object" "object" {
  name   = "gcfv2-source"
  bucket = google_storage_bucket.bucket.name
  source = "./POC-preset-montly-values_function-source.zip"  # Add path to the zipped function source code
}
resource "google_cloudfunctions2_function" "function" {
  name        = "montly-expenses"
  description = "Function that preset recurrent montly expense values to fin spreadsheet"
  location    = "us-west1"

  build_config {
    runtime     = "python310"
    entry_point = "hello_pubsub"
    source {
      storage_source {
        bucket = google_storage_bucket.bucket.name
        object = google_storage_bucket_object.object.name
      }
    }
  }

  service_config {
    max_instance_count = 1
    available_memory   = "256M"
    timeout_seconds    = 60
  }

  event_trigger {
    trigger_region = "us-west1"
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = "projects/smartfinancebills/topics/trigger-montly-expenses"
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
# IAM entry for all users to invoke the function
resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = google_cloudfunctions2_function.function.project
  region         = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

# Scheduler
resource "google_cloud_scheduler_job" "job" {
  name        = "schedule-montly-expenses"
  description = "Schedulers to trigger Pub/Sub that will call the Function to execute montly expenses routine"
  schedule    = "0 18 15,23,25 * *"
  time_zone   = "America/Sao_Paulo"

  pubsub_target {
    topic_name = "projects/smartfinancebills/topics/trigger-montly-expenses"
    data       = base64encode("ping")
  }
}