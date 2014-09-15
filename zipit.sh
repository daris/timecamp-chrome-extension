#!/bin/sh

find . -path '*/.*' -prune -o -type f ! -name "zip*" ! -name "README.md" ! -name "pack.zip" -print | zip ./pack.zip -@
