# Zway-ConditionSwitch

Switches multiple switches and scenes based on various conditions such as 
time, day of week, presence and sensor values. Multiple conditions can be
combined using boolean junctions AND and OR.

If the conditions apply multiple switches and scenes can be either turned 
on or off. If no switched devices are configured, this module will create a 
basic binary sensor that indicates the state of the condition.

# Configuration

## conditions

Conditions that need to apply in order for the selected switches to be
swiched on or off.

## conditions.type

Type of the condition. Can be a binary, multilevel, presence or time 
conditions. Furthermore conditions may be nested to create complex rules.

## conditions.binaryDevice, conditions.binaryValue

Comparison device/value for binary sensors and switches.

## conditions.multilevelDevice, conditions.multilevelOperator, conditions.multilevelValue

Comparison device/operator/value for multilevel sensors and switches.

## conditions.presenceMode

Check for presence mode.

## conditions.time.dayofweek, conditions.time.timeFrom, conditions.time.timeTo

Multiple time periods when the condition should be apply. Time in HH:MM format

## conditions.conditionJunction, condition.conditionElements

For complex conditions, multiple conditions may be combined using boolean
junctions. 

## switches

Multiple switched devices. If no devices are specified, this module will create
a binary sensor to act as the switched device.

## switches.switchBinary.device, switches.switchBinary.status

Switched binary devices.

## switches.switchMultilevel, switches.switchMultilevel.status, switches.switchMultilevel.level

Switched multilevel devices.

## switches.toggleButton.endScene, switches.toggleButton.startScene

Scenes that should be activated if the condition toggles on or off.

# Events

No events are emitted

# Virtual Devices

No virtual device is created

# Installation

Install the BaseModule from https://github.com/maros/Zway-BaseModule first

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-ConditionSwitch.git ConditionSwitch --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/ConditionSwitch
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

Alternatively this module can be installed via the Z-Wave.me app store. Just
go to Management > App Store Access and add 'k1_beta' access token.


# License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or any 
later version.

Switch icon by Francesco Terzini from the Noun Project

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
