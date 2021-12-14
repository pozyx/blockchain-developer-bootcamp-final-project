function eventEmitted(result, eventName, ...expectedArguments) {
    const emittedEvents = result.logs
        .filter(l => l.event === eventName);

    eventEmittedInternal(
        emittedEvents,
        eventName,
        (_, argumentName) => argumentName,
        ...expectedArguments);
}

function eventEmittedEx(receipt, eventName, contractInterface, ...expectedArguments) {
    const emittedEvents = receipt.logs
        .map(function (l) {
            try {
                return contractInterface.parseLog(l);
            }
            catch
            {
                return null;
            }
        })
        .filter(l => l != null)
        .filter(l => l.name === eventName);

    eventEmittedInternal(
        emittedEvents,
        eventName,
        (entry, argumentName) => entry.eventFragment.inputs.map(i => i.name).indexOf(argumentName),
        ...expectedArguments);
}

function eventEmittedInternal(emittedEvents, eventName, getIndexFromEntryFunc, ...expectedArguments) {
    if (emittedEvents.length == 0)
        assert.fail("Expected event '" + eventName + "' emit but did not get one");
    else if (emittedEvents.length > 1)
        assert.fail("Expected 1 event '" + eventName + "' emit but did get " + emittedEvents.length);
    else {
        for (let i = 0; i < expectedArguments.length; i++) {
            const argumentName = Object.keys(expectedArguments[i])[0];
            const argumentValue = expectedArguments[i][argumentName];

            assert.equal(
                emittedEvents[0].args[getIndexFromEntryFunc(emittedEvents[0], argumentName)],
                argumentValue,
                "Expected event '" + eventName + "' emit with argument '" + argumentName + "' equal to '" + argumentValue + "' but did not get match");
        }
    }
}

module.exports = {
    eventEmitted,
    eventEmittedEx
}
