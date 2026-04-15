#!/usr/bin/bash

node server.js & >> log/server.log

node serialLemower.js & >> log/serial.log
