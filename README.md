# Zway-ConditionSwitch

Switches multiple binary switches based on various conditions such as time, 
day of week, presence and sensor values. If all conditions match, the switch
will be turned on, otherwise it will be turned off. If the negate config
option is set this behaviour is inversed.

# Configuration

## presenceMode

Sets multiple presence mode to match.

## time.timeFrom, time.timeTo, time.dayofweek

Sets multiple time periods when the condition should be active. Optionally
day of week can be set.

## binary.device, multilevel.device

Pick the devices that shall be used for condtion calculation.

## mulitlevel.operator

Test operator for multiLevel sensors/switches.

## binary.value, mulilevel.value

Value for the condition test. 

## negate

If negate is set, device will be turned on if no condition matches, otherwise
only if all conditions match.

## devices

Switched devices

# Events

No events are emitted

# Virtual Devices

No virtual device is created

# Installation

Install the BaseModule from https://github.com/maros/Zway-BaseModule first

```shell
cd /opt/z-way-server/automation/modules
git clone https://github.com/maros/Zway-WindowControl.git WindowControl --branch latest
```

To update or install a specific version
```shell
cd /opt/z-way-server/automation/modules/WindowControl
git fetch --tags
# For latest released version
git checkout tags/latest
# For a specific version
git checkout tags/1.02
# For development version
git checkout -b master --track origin/master
```

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
