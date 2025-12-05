import React, { useMemo } from 'react';

export function fnFormatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}


export function fnTransformBrtag(descriptionData) {
    return descriptionData.replaceAll("<br/>", "\n");
}

export function fnNewlineTransformOutput(descriptionData) {
    if (descriptionData) {
        if (!descriptionData.includes("<br/>")) {
            return <p style={{ whiteSpace: 'pre-wrap' }}>{descriptionData}</p>;
        }

        const description = descriptionData.split("<br/>").map((data, idx) => (
            <p key={idx} style={{ whiteSpace: 'pre-wrap' }}>{data}</p>
        ));
        return description;
    } else {
        return descriptionData;
    }

}

export function fnSetBytes(size) {
    const gibSize = size / 1024;
    return (0 < gibSize && gibSize < 1) ? gibSize.toFixed(1) : gibSize;
}

export function fnNewlineTransformInput(descriptionData) {
    return descriptionData.replaceAll("\n", "<br/>");
}

// cidr 계산기
export function fnCalculateCidr_old(cidr, withGw) {
    const bit = cidr.split("/")[1];
    const octet = cidr.split("/")[0].split(".");

    var divide = 32 - bit;
    var cnt = 0;
    while (divide > 8) {
        divide -= 8;
        cnt++;
    }
    const wildcard = Math.pow(2, divide);

    const target = 3 - cnt;
    const targetOctet = octet[target];

    var startIp;
    var endIp;
    for (var i = 0; i < 255; i += wildcard) {
        if (i + wildcard - 1 >= targetOctet && targetOctet >= i) {
            startIp = i;
            endIp = i + wildcard - 1;
            break;
        }
    }

    const st = octet.map((el, idx) => (
        idx == target ? startIp : idx > target ? 0 : Number(el)
    ))
    const ed = octet.map((el, idx) => (
        idx == target ? endIp : idx > target ? 255 : Number(el)
    ))

    const data = {
        startIp: st[0] + "." + st[1] + "." + st[2] + "." + (st[3] + 2),
        endIp: ed[0] + "." + ed[1] + "." + ed[2] + "." + (ed[3] === 255 ? 254 : ed[3]),
        gatewayIp: withGw ? st[0] + "." + st[1] + "." + st[2] + "." + (st[3] + 1) : '',
    }

    return data;
}

export function fnAddCommar(price) {
    let returnString = price?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return returnString;
}


// IP 주소를 32비트 정수로 변환
const ipToInt = (ip) => {
    return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0);
}

// 32비트 정수를 IP 주소로 변환
const intToIp = (int) => {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join('.');
}

// CIDR 값을 기반으로 네트워크, 게이트웨이, IP 풀 계산
export function fnCalculateCidr(cidr) {
    const [ip, prefixLength] = cidr.split("/");
    const prefix = parseInt(prefixLength, 10);

    // 네트워크 주소 계산
    const ipInt = ipToInt(ip);
    const mask = -1 << (32 - prefix);
    const networkAddressInt = ipInt & mask;
    const broadcastAddressInt = networkAddressInt | ~mask;

    // 게이트웨이 IP (네트워크 주소의 첫 번째 사용 가능한 IP)
    const gatewayIPInt = networkAddressInt + 1;

    // IP 풀 범위 (게이트웨이 주소 + 1 부터 브로드캐스트 주소 - 1 까지)
    const ipPoolStartInt = gatewayIPInt + 1;
    const ipPoolEndInt = broadcastAddressInt - 1;

    return {
        networkAddress: intToIp(networkAddressInt),
        subnetMask: intToIp(mask >>> 0),
        gatewayIp: intToIp(gatewayIPInt),
        startIp: intToIp(ipPoolStartInt),
        endIp: intToIp(ipPoolEndInt),
    };
}

/**
 * Return a **new** array sorted by the given string field (default “name”).
 * Non-string or missing values are treated as empty strings.
 *
 * @param {Array<Object>} list      – the array to sort
 * @param {string}        [field]   – the object key to sort by
 * @returns {Array<Object>}         – a sorted copy
 */
export function sortByField(list, field = 'name') {
    return [...list].sort((a, b) => {
        const va = String(a[field] ?? '').localeCompare(String(b[field] ?? ''));
        return va;
    });
}

/**
 * Hook that returns a new array sorted by the given field.
 * Re-computes only when `list` or `field` changes.
 */
export function useSorted(list, field = 'name') {
    return useMemo(() => sortByField(list, field), [list, field]);
}