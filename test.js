var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var dynamoDb = require('aws-sdk/clients/dynamodb');

var dynamoClient = new dynamoDb.DocumentClient({region: 'us-east-1'});
//console.log(dynamoClient);

const findByUserIdRequest = {
    TableName: 'userTable',
    FilterExpression: "contains(:ids, id)",
    ExpressionAttributeValues: {
        ":ids": ['d38c9b40-adea-11e8-b66f-b30a0f248a38', '760c28a0-ae5d-11e8-acb0-8b5b76763afd']
    }
};

dynamoClient.scan(findByUserIdRequest).promise().then((item) => console.log(item))
.catch((error) => {
console.error(error);  
});

// console.log(jwt.verify(`eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJmb28iOiJiYXIiLCJpYXQiOjE1MzU4MTIwNzB9.VvNGGuJVElfLrUzrbKeormliTiZoBxNYq1BCknkrbdR4y2d-_3FHwK_kKmDSgDrRbdx02EBc5TLzm4sic3Nc5ggdPuJb8kKnIPDjxdMA9C2iBg0FLZDpJVsowLJhXsT_FEYYiG2qgBBBlYumxCAH9jW0WYoOHgrwbNDaBDiVpds`,
// `-----BEGIN PUBLIC KEY-----
// MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCJjdX4qKWU6ldkV2OfuDN4hc4W
// rUJfr+RXMFYx8aHp1asMrj0Xe+DuH8jnC7LNrZPO+hEqcf0bZLqAtTknbb3+nwMK
// XENT5RExT6Ih/qIVF3V2MxxqxsT2KNOIwVl5JQIi6a4CFJHco2d8RVuZl2ILtkOQ
// P+K5JYNtZnXyiPnEDwIDAQAB
// -----END PUBLIC KEY-----`))

// console.log(jwt.sign({ foo: 'bar' }, `-----BEGIN RSA PRIVATE KEY-----
// MIICXgIBAAKBgQCJjdX4qKWU6ldkV2OfuDN4hc4WrUJfr+RXMFYx8aHp1asMrj0X
// e+DuH8jnC7LNrZPO+hEqcf0bZLqAtTknbb3+nwMKXENT5RExT6Ih/qIVF3V2Mxxq
// xsT2KNOIwVl5JQIi6a4CFJHco2d8RVuZl2ILtkOQP+K5JYNtZnXyiPnEDwIDAQAB
// AoGAKlJddzhMWdkQMmtA16+RBpAErK16Mn6nvru8iXlS2+NF0Yz6dvNCbYGSCqRq
// yyWQyKngBjM0MO15BIi9oQf+4JkJfX3E5DQUBP1nMHebvEN0cVX5Lw2/nIyTynEP
// jHVjhE/QLDf3FhgF9uP8eYZf3eGVAbZLt4ki420VZEldaqECQQC9anVqQfkJwMXt
// Yd62hHgCLSrpMHTS2sv+tJL5M0A8cuzxikbj697XNpBAsP3JDEND6G4gHLzIHEVy
// m+lwoh4zAkEAuehUqajDaGNZImnusQgvP6B+wKwp3f4+7sAo2/r8ds31LY7IV1q0
// OTkCpJeLq+LbRN429EjU8isFa4nHs53utQJBAJj/yhHnckrvfLDvch9Jx0oyw8uS
// SXscItT9dQ532HY7eqrsP7DRELIUL9chYA2qqxbKQ1ILBG47b9lQmPJS8UMCQQCW
// 6gw4QcCHMAb+kcHrQjqgyxe6Lsg55peN1r4UfXWOt/itB/iIOSCOR0Jm/IKsgRcA
// m+c+fRUolVXsC0fq/mz1AkEAiT+sDktK1T5wie/Nsi8icXoMDpmVz4YJTrQ3Mnov
// X6IzCHAFXQavJP+YlcWG3hsacOTV7jQ96mqRa1r9tW45SA==
// -----END RSA PRIVATE KEY-----`, { algorithm: 'RS256'}));

'$2a$10$sCNoWUFT7xz0DcCBBRq2He6XoZqH06yuVUEV87cB0mNT4QrRw3ZyK'