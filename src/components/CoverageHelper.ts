export default class CoverageHelper {
    static isInsideBlock(innerLocation: string, outerLocation: string) {
        let coordsInner = innerLocation.replace(/\)|\(/g, '').split(':')
        let coordsOuter = outerLocation.replace(/\)|\(/g, '').split(':')
        if (!(coordsInner.length === coordsOuter.length && coordsOuter.length === 5)) {
            console.error('error parsing locations', innerLocation, outerLocation)
            return false
        }
        let isFileNameEqual = coordsInner[0] === coordsOuter[0]
        let isAfterStart =
            parseInt(coordsInner[1]) > parseInt(coordsOuter[1]) ||
            (parseInt(coordsInner[1]) === parseInt(coordsOuter[1]) && parseInt(coordsInner[2]) > parseInt(coordsOuter[2]))
        let isBeforeEnd =
            parseInt(coordsInner[3]) < parseInt(coordsOuter[3]) ||
            (parseInt(coordsInner[3]) === parseInt(coordsOuter[3]) && parseInt(coordsInner[4]) < parseInt(coordsOuter[4]))
        // console.log(isFileNameEqual, isAfterStart, isBeforeEnd)
        return isFileNameEqual && isAfterStart && isBeforeEnd
    }

    static *filterForMapValues(iterable: any[], predicate: Function) {
        var i = 0;
        for (var item of iterable) {
            if (predicate(item))
                yield item;
        }
    }
}