function eventEmitted(result, eventName) // + optional { name: value } objects as expected arguments
{
    const emittedEvents = result.logs.filter(l => l.event === eventName);

    if (emittedEvents.length == 0)
        assert.fail("Expected event '" + eventName + "' emit but did not get one");
    else if (emittedEvents.length > 1)
        assert.fail("Expected 1 event '" + eventName + "' emit but did get " + emittedEvents.length);
    else {
        for (let i = 2; i < arguments.length; i++) {
            const argumentName = Object.keys(arguments[i])[0];
            const argumentValue = arguments[i][argumentName];

            assert.equal(
                emittedEvents[0].args[argumentName],
                argumentValue,
                "Expected event '" + eventName + "' emit with argument '" + argumentName + "' equal to '" + argumentValue + "' but did not get match");
        }
    }
}

module.exports = {
    eventEmitted
}
