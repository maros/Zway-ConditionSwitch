/*** ConditionSwitch Z-Way HA module *******************************************

Version: 1.00
(c) Maroš Kollár, 2015
-----------------------------------------------------------------------------
Author: Maroš Kollár <maros@k-1.com>
Description:
    Switch devices if conditions are met

******************************************************************************/

function ConditionSwitch (id, controller) {
    // Call superconstructor first (AutomationModule)
    ConditionSwitch.super_.call(this, id, controller);
    
    this.timeout = undefined;
}

inherits(ConditionSwitch, BaseModule);

_module = ConditionSwitch;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

ConditionSwitch.prototype.init = function (config) {
    ConditionSwitch.super_.prototype.init.call(this, config);

    var self = this;
    
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
    
    self.bindDevices(self.config.multilevel,'on');
    self.bindDevices(self.config.binary,'on');
    
    self.initTimeouts();
    self.checkCondition();
};

ConditionSwitch.prototype.stop = function () {
    var self = this;
    
    ConditionSwitch.super_.prototype.stop.call(this);
    
    var presence = self.getDevice([
       ['probeType','=','Presence']
    ]);
    presence.off('change:metrics:mode',self.callback);
    
    self.bindDevices(self.config.multilevel,'off');
    self.bindDevices(self.config.binary,'off');
    
    if (typeof(self.timeout) !== 'undefined') {
        clearTimeout(self.timeout);
    }
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

ConditionSwitch.prototype.bindDevices = function(checks,command) {
    var self = this;
    
    _.each(checks,function(check) {
        var device = self.controller.devices.get(check.device);
        if (typeof(device) !== 'undefined') {
            self.controller.devices[command](check.device, "change:metrics:level", self.callback);
            //self.controller.devices[command](check.device, "change:metrics:change", self.callback);
        }
    });
};

ConditionSwitch.prototype.initTimeouts = function() {
    var self = this;
    
    if (typeof(self.timeout) !== 'undefined') {
        clearTimeout(self.timeout);
    }
    
    var timeouts = [];
    _.each(self.config.time,function(time) {
        var timeout = self.calculateTimeout(time);
        if (typeof(timeout) !== 'undefined') {
            timeouts.push(timeout);
        }
    });
    timeouts.sort();
    if (typeof(timeouts[0]) !== 'undefined') {
        self.timeout = startTimeout(self.callback,timeout * 1000);
    }
};

ConditionSwitch.prototype.calculateTimeout = function(time) {
    var self = this;
    
    var dateNow     = new Date();
    var dayofweek   = time.dayofweek;
    var timeFrom    = time.timeFrom;
    var timeTo      = time.timeTo;
    var results     = [];
    
    if (typeof(timeFrom) === 'undefined'
        && typeof(timeTo) === 'undefined') {
        return;
    }
    
    _.each([timeFrom,timeTo],function(timeString) {
        var dateCalc = self.parseTime(timeString);
        while (dateCalc < dateNow 
            || (
                typeof(dayofweek) === 'object'
                && dayofweek.length > 0 
                && _.indexOf(dayofweek, dateCalc.getDay().toString()) === -1
            )) {
            var hour = dateCalc.getHours();
            var minute = dateCalc.getMinutes();
            dateCalc.setHours(hour + 24);
            dateCalc.setHours(hour,minute);
        }
        results.push(dateCalc);
        self.log('Next:'+timeString+'-'+dateCalc);
    });
    
    if (results.length === 0) {
        return;
    }
        
    results.sort();
    return (results[0].getTime() - dateNow.getTime());
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
        condition = false;
    }
    
    // Check time
    if (condition === true
        && self.config.time.length > 0) {
        var timeCondition = false;
        _.each(self.config.time,function(time) {
            var timeFrom    = self.parseTime(time.timeFrom);
            var timeTo      = self.parseTime(time.timeTo);
            
            // Check time
            if (typeof(timeFrom) === 'undefined'
                || typeof(timeTo) === 'undefined') {
                return;
            }
            
            // Check day of week if set
            if (typeof(schedule.dayofweek) === 'object' 
                && schedule.dayofweek.length > 0
                && _.indexOf(schedule.dayofweek, dayNow.toString()) === -1) {
                return;
            }
            
        });
        condition = timeCondition;
    }
};