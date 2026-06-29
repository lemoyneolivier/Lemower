#!/usr/bin/bash

node server.js & /home/olivier/Documents/lemower/server/Lemower/config.json >> log/server.log

node serialLemower.js /home/olivier/Documents/lemower/server/Lemower/config.json & >> log/serial.log
