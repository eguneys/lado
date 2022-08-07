#!/bin/bash

ROUTES="key rhythm"
cd dist
mkdir learn
for f in $ROUTES 
do
  echo $f.html
  cp index.html $f.html
done
