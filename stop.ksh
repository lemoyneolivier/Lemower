#!/usr/bin/bash

ps -fu | grep node | grep server | cut -c 11-18 | xargs -r kill

ps -fu | grep node | grep serial | cut -c 11-18 | xargs -r kill
