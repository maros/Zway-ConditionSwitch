/*** ConditionSwitch Z-Way HA module *******************************************

Version: 1.10
(c) Maroš Kollár, 2015-2017
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Switch devices if conditions are met

******************************************************************************/

function ConditionSwitch (id, controller) {
    // Call superconstructor first (AutomationModule)
    ConditionSwitch.super_.call(this, id, controller);

    this.bindings = [];
    this.cronName = undefined;
}

inherits(ConditionSwitch, BaseModule);

_module = ConditionSwitch;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ConditionSwitch.prototype.init = function (config) {
    ConditionSwitch.super_.prototype.init.call(this, config);

    var self = this;
    self.cronName = "ConditionSwitch.check."+self.id;

    self.vDev = self.controller.devices.create({
        deviceId: "ConditionSwitch_" + self.id,
        defaults: {
            metrics: {
                level: 'off',
                title: self.langFile.m_title,
                icon: 'motion'
            },
        },
        overlay: {
            probeType: 'general_purpose',
            deviceType: 'sensorBinary'
        },
        handler: function(command, args) {
            if (command === 'update') {
                self.checkCondition();
            }
        },
        moduleId: self.id
    });

    if (self.config.switches.length > 0) {
        self.vDev.set({'visibility': false});
    }

    setTimeout(_.bind(self.initCallback,self),12000);
};

ConditionSwitch.prototype.initCallback = function() {
    var self = this;

    self.callback   = _.bind(self.checkCondition,self);

    // Bind presence change
    var presence = self.getDevice([
        ['probeType','=','presence']
    ]);
    presence.on('change:metrics:mode',self.callback);

    // Bind conditions
    self.bindCondition(self.config.condition,true);

    // Bind cron
    self.controller.on(self.cronName, self.callback);

    self.checkCondition();
};

ConditionSwitch.prototype.stop = function () {
    var self = this;

    ConditionSwitch.super_.prototype.stop.call(this);

    if (self.vDev) {
        self.controller.devices.remove(self.vDev.id);
        self.vDev = undefined;
    }

    // Unbind presence
    var presence = self.getDevice([
       ['probeType','=','presence']
    ]);
    presence.off('change:metrics:mode',self.callback);

    // Bind conditions
    self.bindCondition(self.config.condition,false);

    // Unbind cron
    self.controller.off(self.cronName, self.callback);
    self.controller.emit("cron.removeTask", self.cronName);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ConditionSwitch.prototype.bindCondition = function(condition,mode) {
    var self = this;

    switch(condition.type) {
        case 'binary':
            self.bindDevice(condition.binaryDevice,mode);
            break;
        case 'multilevel':
            self.bindDevice(condition.multilevelDevice,mode);
            break;
        case 'time':
            if (mode) {
                _.each(condition.time,function(time) {
                    _.each(['timeFrom','timeTo'],function(timeString) {
                        var parsedTime = self.parseTime(time[timeString]);
                        if (time.dayofweek.length === 0
                            || time.dayofweek.length === 7) {
                            self.controller.emit("cron.addTask",self.cronName, {
                                minute:     parsedTime.getMinutes(),
                                hour:       parsedTime.getHours(),
                                weekDay:    null,
                                day:        null,
                                month:      null,
                            });
                        } else {
                            _.each(time.dayofweek,function(dayofweek) {
                                self.controller.emit("cron.addTask",self.cronName, {
                                    minute:     parsedTime.getMinutes(),
                                    hour:       parsedTime.getHours(),
                                    weekDay:    parseInt(dayofweek,10),
                                    day:        null,
                                    month:      null,
                                });
                            });
                        }
                    });
                });
            }
            break;
        case 'date':
            if (mode) {
                var dateNow = new Date();
                _.each(condition.date,function(date) {
                    _.each(['dateFrom','dateTo'],function(dateString) {
                        var parsedDate = self.parseDate(date[dateString]);
                        if (dateString === 'dateTo') {
                            parsedDate.setHours(23,59,59,0);
                        }
                        if (parsedDate < dateNow) {
                            parsedDate.setFullYear( parsedDate.getFullYear() + 1 );
                        }
                        self.controller.emit("cron.addTask",self.cronName, {
                            minute:     0,
                            hour:       0,
                            weekDay:    null,
                            day:        parsedDate.getDay,
                            month:      parsedDate.getMonth
                        });
                    });
                });
            }
            break;
        case 'condition':
            _.each(condition.conditionElements,function(element) {
                self.bindCondition(element,mode);
            });
            break;
    }
};

ConditionSwitch.prototype.bindDevice = function(deviceId,mode) {
    var self = this;

    var device  = self.controller.devices.get(deviceId);
    var index   = self.bindings.indexOf(deviceId);

    if (! _.isNull(device)) {
        if (mode === true
            && index === -1) {
            self.bindings.push(deviceId);
            device.on("modify:metrics:level", self.callback);
        } else if (mode === false) {
            if (index !== -1)
            self.bindings.splice(index,1);
            device.off("modify:metrics:level", self.callback);
        }
    } else {
        self.error('Could not find device '+deviceId);
    }
};

ConditionSwitch.prototype.checkCondition = function() {
    var self = this;

    var condition   = self.evaluateCondition(self.config.condition);
    var switches    = self.config.switches;
    var oldLevel    = self.vDev.get('metrics:level') || 'off';
    var newLevel    = condition ? 'on':'off';

    self.log('Calculating switch condition: '+(condition ? 'true':'false'));

    if (oldLevel !== newLevel) {
        self.vDev.set('metrics:level',condition ? 'on':'off');

        _.each(self.config.switches,function(singleSwitch) {
            var switchType  = singleSwitch.type;
            var curSwitch   = singleSwitch[switchType];
            var vDev;

            // toggle button switches
            if (switchType === 'toggleButton'){
                vDev = self.controller.devices.get(condition ? curSwitch.startScene : curSwitch.endScene);
                if (!!vDev) {
                    vDev.performCommand('on');
                }
            // event
            } else if (switchType === 'event'){
                var event = condition ? curSwitch.startEvent : curSwitch.endEvent;
                if (!!event) {
                    self.controller.emit(event);
                }
            // thermostat
            } else if (switchType === 'thermostat') {
                vDev = self.controller.devices.get(curSwitch.device);
                if (!!vDev) {
                    var thermostatLevel = condition ? curSwitch.level : vDev.get('metrics:lastLevelContition');
                    vDev.set('metrics:lastLevelContition',condition ? vDev.get('metrics:level') : undefined);
                    vDev.performCommand("exact", { level: thermostatLevel });
                } else {
                    self.error('Could not find device '+curSwitch.device);
                }
            // switch binary/multilevel switches
            } else {
                vDev = self.controller.devices.get(curSwitch.device);
                if (!!vDev) {
                    switch(curSwitch.status) {
                        case 'level':
                            var switchLevel = condition ? curSwitch.level : (curSwitch.level === 0 ? 255:0);
                            vDev.set('metrics:level:original',condition ? vDev.get('metrics:level') : undefined);
                            vDev.performCommand("exact", { level: switchLevel });
                            break;
                        case 'on':
                            vDev.performCommand(condition ? 'on':'off');
                            break;
                        case 'off':
                            vDev.performCommand(condition ? 'off':'on');
                            break;
                    }
                } else {
                    self.error('Could not find device '+curSwitch.device);
                }
            }
        });
    }
};

ConditionSwitch.prototype.evaluateCondition = function(condition) {
    var self = this;

    var device, level;
    switch(condition.type) {
        case 'binary':
            device = self.controller.devices.get(condition.binaryDevice);
            if (!_.isNull(device)) {
                level = device.get('metrics:level');
                return (condition.binaryValue === level);
            }
            return false;
        case 'multilevel':
            device = self.controller.devices.get(condition.multilevelDevice);
            if (!_.isNull(device)) {
                level = device.get('metrics:level');
                return self.compare(level,condition.multilevelOperator,condition.multilevelValue);
            }
            return false;
        case 'presenceMode':
            var presence = self.getPresenceMode();
            return (condition.presenceMode.indexOf(presence) !== -1);
        case 'date':
            var dateNow         = new Date();
            var dateCondition   = false;
            _.each(condition.date,function(date) {
                if (dateCondition === true) {
                    return;
                }

                if (! self.checkDatePeriod(date.dateFrom,date.dateTo)) {
                    return;
                }

                dateCondition = true;
            });
            return dateCondition;
        case 'time':
            var timeNow         = new Date();
            var dayofweekNow    = timeNow.getDay().toString();
            var timeCondition   = false;

            _.each(condition.time,function(time) {
                if (timeCondition === true) {
                    return;
                }

                // Check day of week if set
                if (typeof(time.dayofweek) === 'object'
                    && time.dayofweek.length > 0
                    && _.indexOf(time.dayofweek, dayofweekNow.toString()) === -1) {
                    return;
                }

                if (! self.checkPeriod(time.timeFrom,time.timeTo)) {
                    return;
                }

                timeCondition = true;
            });

            return timeCondition;
        case 'condition':
            for (var i = 0; i < condition.conditionElements.length; i++) {
                var result = self.evaluateCondition(condition.conditionElements[i]);
                if (condition.conditionJunction === 'or' && result === true) {
                    return true;
                } else if (condition.conditionJunction === 'and' && result === false) {
                    return false;
                }
            }
            if (condition.conditionJunction === 'or') {
                return false;
            } else if (condition.conditionJunction === 'and') {
                return true;
            }
            break;
    }
};

ConditionSwitch.prototype.checkDatePeriod = function(dateFrom,dateTo) {
    var self = this;

    var dateNow = new Date();

    // Check from/to time
    if (typeof(dateFrom) === 'string') {
        dateFrom = self.parseDate(dateFrom);
    }
    if (typeof(dateTo) === 'string') {
        dateTo = self.parseDate(dateTo);
    }

    if (typeof(dateFrom) === 'undefined'
        || typeof(dateTo) === 'undefined') {
        return true;
    }

    // Period over new year
    if (dateFrom >= dateTo) {
        if (dateTo <= dateNow) {
            dateTo.setFullYear(dateTo.getFullYear() + 1);
        } else {
            dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        }
    }

    dateFrom.setHours(0,0,0,0);
    dateTo.setHours(23,59,59,0);

    if (dateFrom > dateNow || dateNow > dateTo) {
        return false;
    }

    return true;
};

ConditionSwitch.prototype.parseDate = function(dateString) {
    if (typeof(dateString) === 'undefined') {
        return;
    }

    var match = dateString.match(/^(\d{1,2}).(\d{1,2})$/);
    if (!match) {
        this.log('Could not parse date: '+dateString);
        return;
    }
    var month       = parseInt(match[1],10);
    var day         = parseInt(match[2],10);
    var dateNow     = new Date();
    return new Date(
        dateNow.getFullYear(),
        month - 1,
        day,
        0,
        0,
        0,
        0
    );
};