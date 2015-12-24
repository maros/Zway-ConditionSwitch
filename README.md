# Zway-ConditionSwitch

TODO

# Configuration

TODO

# Events

TODO

# Virtual Devices

This module creates a virtual binary switch that enables/disabled window
control action.

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
