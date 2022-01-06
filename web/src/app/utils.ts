export default class Utils {
    static shortenAddressOrHash(val: string) {
        return val.substring(0, 10)
            + '.....' + val.substring(val.length - 10);
    }
}