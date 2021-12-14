const errorString = "VM Exception while processing transaction: ";
const relayErrorString = "Failed to relay call";

async function tryCatch(promise, reason) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error, "Expected a VM exception but did not get one");
        assert(error.message.search(errorString + reason) >= 0, "Expected an error containing '" + errorString + reason + "' but got '" + error.message + "' instead");
    }
};

async function tryCatchRelayed(promise, reason) {
    try {
        await promise;
        throw null;
    }
    catch (error) {
        assert(error, "Expected a Relay error but did not get one");
        assert(error.message.search(relayErrorString) >= 0 && error.message.search(reason) >= 0, "Expected an error containing '" + relayErrorString + "' and '" + reason + "' but got '" + error.message + "' instead");
    }
};

module.exports = {
    catchRevert            : async function(promise) {await tryCatch(promise, "revert"             );},
    catchOutOfGas          : async function(promise) {await tryCatch(promise, "out of gas"         );},
    catchInvalidJump       : async function(promise) {await tryCatch(promise, "invalid JUMP"       );},
    catchInvalidOpcode     : async function(promise) {await tryCatch(promise, "invalid opcode"     );},
    catchStackOverflow     : async function(promise) {await tryCatch(promise, "stack overflow"     );},
    catchStackUnderflow    : async function(promise) {await tryCatch(promise, "stack underflow"    );},
    catchStaticStateChange : async function(promise) {await tryCatch(promise, "static state change");},

    catchPaymasterReject   : async function(promise) {await tryCatchRelayed(promise, "paymaster rejected");},
};
