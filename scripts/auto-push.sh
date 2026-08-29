#!/bin/bash
# Background push loop: pushes new commits to origin every 60 seconds
cd /Users/priyanshu/Documents/geoagent-emegency-project
while true; do
  sleep 60
  git push origin main 2>&1 | tail -3
done