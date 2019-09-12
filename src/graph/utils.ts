export function isIterable<T>(obj: any): obj is Iterable<T> {
    if (obj === null || obj === undefined) return false;
    return typeof obj[Symbol.iterator] === 'function';
}

export function setIntersection<T>(x: Set<T>, y: Set<T>): Set<T> {
    const intersection = new Set<T>();
    if(x.size < y.size) {
        x.forEach((elem) => {
            if(y.has(elem)) intersection.add(elem);
        })
    } else {
        y.forEach((elem) => {
            if(x.has(elem)) intersection.add(elem);
        })
    }
    return intersection;
}

export function setUnion<T>(x: Set<T>, y: Set<T>): Set<T> {
    const union = new Set<T>([...x, ...y]);
    return union;
}