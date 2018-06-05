#!/usr/bin/env bash
TAG=$(git tag -l --sort=-v:refname | head -1 | sed 's/\.[^.]*$//')
cat package.json | jq --arg newversion $TAG '.version=$newversion' > package.json