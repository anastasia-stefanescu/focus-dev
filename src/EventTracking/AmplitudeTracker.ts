import * as amplitude from '@amplitude/analytics-node';

amplitude.init('53ae1e9bcfa0b38180e84285b00d8954');

amplitude.track('Sign Up', undefined, {
    device_id: '<ENTER DEVICE ID>',
});
