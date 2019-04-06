#!/usr/bin/env bash
# stepup notes add --section ()...)
# TAG=$(stepup version --next-release | sed 's/\.[^.]*$//')

# $ node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]), null, '\t'));" '{"foo":"lorem","bar":"ipsum"}'
TAG=$(git tag -l --sort=-v:refname | head -1 | sed 's/\.[^.]*$//')
echo $(cat package.json | jq --arg newversion $TAG '.version=$newversion') <<< package.json
echo $(cat package.json | jq --arg newversion $TAG '.version=$newversion') | sed -e 's/^/"/g' -e 's/$/"/g'
# stepup version create