#! /bin/bash

systemctl restart urrevsapi

if [ $? -eq 0 ]; then
    echo Successfully restarted urrevsapi
else
    echo Failed to restart urrevsapi
fi
