/*** ConditionSwitch Z-Way HA module *******************************************

Version: 1.03
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Switch devices if conditions are met

******************************************************************************/

function ConditionSwitch (id, controller) {
    // Call superconstructor first (AutomationModule)
    ConditionSwitch.super_.call(this, id, controller);
    
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
            deviceType: 'sensorBinary'
        },
        handler: function(command, args) {
            if (command === 'update') {
                self.checkCondition();
            }
        },
        moduleId: self.id
    });
    
    if (self.config.devices.length > 0) {
        self.vDev.set({'visibility': false});
    }
    
    setTimeout(_.bind(self.initCallback,self),12000);
};

ConditionSwitch.prototype.initCallback = function() {
    var self = this;
    
    self.tests = {};
    self.callback   = _.bind(self.checkCondition,self);
    
    var presence = self.getDevice([
        ['probeType','=','Presence']
    ]);
    presence.on('change:metrics:mode',self.callback);
    
    self.controller.on(self.cronName, self.callback);
    
    _.each(self.config.time,function(time) {
        _.each(['timeFrom','timeTo'],function(timeString) {
            var date = self.parseTime(time[timeString]);
            var dayofweek = time.dayofweek.length === 0 ? null : time.dayofweek;
            self.controller.emit("cron.addTask",self.cronName, {
                minute:     date.getMinutes(),
                hour:       date.getHours(),
                weekDay:    dayofweek,
                day:        null,
                month:      null,
            });
        });
    });
    
    self.bindDevices(self.config.multilevel,'on');
    self.bindDevices(self.config.binary,'on');
    
    self.checkCondition();
};

ConditionSwitch.prototype.stop = function () {
    var self = this;
    
    ConditionSwitch.super_.prototype.stop.call(this);
    
    if (self.vDev) {
        self.controller.devices.remove(self.vDev.id);
        self.vDev = undefined;
    }
    
    var presence = self.getDevice([
       ['probeType','=','Presence']
    ]);
    presence.off('change:metrics:mode',self.callback);
    self.controller.off(self.cronName, self.callback);
    
    self.bindDevices(self.config.multilevel,'off');
    self.bindDevices(self.config.binary,'off');
    
    self.controller.emit("cron.removeTask", self.cronName);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ConditionSwitch.prototype.bindDevices = function(checks,command) {
    var self = this;
    
    _.each(checks,function(check) {
        var device = self.controller.devices.get(check.device);
        if (typeof(device) !== 'undefined') {
            self.controller.devices[command](check.device, "modify:metrics:level", self.callback);
            //self.controller.devices[command](check.device, "change:metrics:change", self.callback);
        }
    });
};

ConditionSwitch.prototype.checkCondition = function() {
    var self = this;
    
    self.log('Calculating switch condition');
    
    var presence        = self.getPresenceMode();
    var dateNow         = new Date();
    var dayofweekNow    = dateNow.getDay().toString();
    var condition       = true;
    
    // Check presence
    if (self.config.presenceMode.length > 0
        && self.config.presenceMode.indexOf(presence) === -1) {
        self.log('Presence does not match');
        condition = false;
    }
    
    // Check time
    if (condition === true
        && self.config.time.length > 0) {
        var timeCondition = false;
        _.each(self.config.time,function(time) {
            if (timeCondition === true) {
                return;
            }
            var timeFrom    = self.parseTime(time.timeFrom);
            var timeTo      = self.parseTime(time.timeTo);
            
            // Check time
            if (typeof(timeFrom) === 'undefined'
                || typeof(timeTo) === 'undefined') {
                return;
            }
            
            // Check day of week if set
            if (typeof(time.dayofweek) === 'object' 
                && time.dayofweek.length > 0
                && _.indexOf(time.dayofweek, dayofweekNow.toString()) === -1) {
                self.log('Day of week does not match');
                return;
            }
            
            if (timeTo < timeFrom) {
                if (timeTo.getDate() === dateNow.getDate()) {
                    var fromHour   = timeFrom.getHours();
                    var fromMinute = timeFrom.getMinutes();
                    timeFrom.setHours(fromHour - 24);
                    // Now fix time jump on DST
                    timeFrom.setHours(fromHour,fromMinute);
                } else {
                    var toHour     = timeTo.getHours();
                    var toMinute   = timeTo.getMinutes();
                    timeTo.setHours(toHour + 24);
                    // Now fix time jump on DST
                    timeTo.setHours(toHour,toMinute);
                }
            }
            
            if (timeFrom > dateNow || dateNow > timeTo) {
                self.log('Time does not match');
                return;
            }
            
            timeCondition = true;
        });
        condition = timeCondition;
    }
    
    // Check binary
    _.each(self.config.binary,function(check) {
        if (condition) {
            var device = self.controller.devices.get(check.device);
            if (typeof(device) !== 'undefined') {
                var level = device.get('metrics:level');
                if (check.value !== level) {
                    self.log('Binary does not match');
                    condition = false;
                }
            } else {
                self.error('Could not find device '+check.device);
            }
        }
    });
    
    // Check multilevel
    _.each(self.config.multilevel,function(check) {
        if (condition) {
            var device = self.controller.devices.get(check.device);
            if (typeof(device) !== 'undefined') {
                var level = device.get('metrics:level');
                if (self.compare(check.value,check.operator,level)) {
                    self.log('Multilevel does not match');
                    condition = false;
                }
            } else {
                self.error('Could not find device '+check.device);
            }
        }
    });
    
    var switches = self.config.switches;
    var oldLevel = self.vDev.get('metrics:level') || 'off';
    var newLevel = condition ? 'on':'off';
    
    if (oldLevel !== newLevel) {
        self.vDev.set('metrics:level',condition ? 'on':'off');
        
        _.each(self.config.switches,function(singleSwitch) {
            var switchType  = singleSwitch.type;
            var curSwitch   = singleSwitch[switchType];
            var vDev;
            //vDev = curSwitch.startScene ? self.getDev(curSwitch.startScene) : self.getDev(curSwitch.device);
            
            // toggle button switches
            if (switchType === 'toggleButton'){
                vDev = self.controller.devices.get(condition ? curSwitch.startScene : curSwitch.endScene);
                if (!!vDev) {
                    vDev.performCommand('on');
                }
            // switch binary/multilevel switches
            } else {
                vDev = self.controller.devices.get(curSwitch.device);
                if (!!vDev) {
                    switch(curSwitch.status) {
                        case 'level':
                            var offLevel = (level === 0) ? 100:0;
                            vDev.performCommand("exact", { level: condition ? curSwitch.level:offLevel });
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

ConditionSwitch.prototype.compare = function (val1, op, val2) {
    if (op === "=") {
        return val1 === val2;
    } else if (op === "!=") {
        return val1 !== val2;
    } else if (op === ">") {
        return val1 > val2;
    } else if (op === "<") {
        return val1 < val2;
    } else if (op === ">=") {
        return val1 >= val2;
    } else if (op === "<=") {
        return val1 <= val2;
    }
    
    return null; // error!!  
};