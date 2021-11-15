import axios, {AxiosRequestConfig, AxiosResponse, Method} from 'axios';
import * as https from 'https';

https.globalAgent.options.rejectUnauthorized = false;

type ApiTestOperation = {
    apiId: string;
    name: string;
    method: string;
    endpoint: string;
    path: string;
    type: string;
    data: any;
    headers: any;
    parameters: any;
    statusCode: number;
    jestMaxRuntime: number;
    jestMatchOperation: string;
    jestMatchName: string;
    jestMatchValue: string;
}

function findValue(response: AxiosResponse, path) {
    if (!path) {
        path = 'data';
    }
    const paths = path.split('.');
    let finalValue = response;

    for (let i = 1; i < paths.length; i++) {
        if (!finalValue[paths[i]]) return undefined;
        finalValue = finalValue[paths[i]];
    }
    return finalValue;
}

const servers = (process.env.P9_SERVER_URL && process.env.P9_SERVER_TOKEN)
    ? [{url: process.env.P9_SERVER_URL, token: process.env.P9_SERVER_TOKEN}]
    : JSON.parse(`[{"url":"https://planet9dev.neptune-software.com:8081","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjY2E3YTlmLTUyNDAtNDVlYi1hM2Q1LWMzZjFjM2M5NThkOCIsInV1aWQiOiI0NzdjOTcxZi01ZGVhLTQ2ZjAtOTNmMS05N2ZjZGEyY2MwMGEiLCJpYXQiOjE2MzA0MDg4MDMsImV4cCI6MTcxNjgwODgwM30.piMmlq_AFsvz1QJO45nzA4Au9wY7VvDrNBwkGxMyT8k"}]`);

const apiOperationsToTest: ApiTestOperation[] = JSON.parse('[{"apiId":"9c8592ff-af09-ec11-949f-7085c23ef572","name":"Returns data","endpoint":"https://p9:8081/api/functions","method":"POST","path":"/Dictionary/List","type":"","data":"","headers":{},"parameters":{},"statusCode":"","jestMaxRuntime":2000,"jestMatchName":"req.data","jestMatchOperation":"toBeTruthy","jestMatchValue":""}]');

for (let server of servers) {
    for (let operationToTest of apiOperationsToTest) {
        describe(operationToTest.name, () => {
            test(`${operationToTest.method} ${operationToTest.path}`, async () => {
                const runtimeStart = new Date().getTime();

                const parameterKeys = Object.keys(operationToTest.parameters);
                const parameters = parameterKeys.length > 0
                    ? `?${parameterKeys.map(key => `${key}=${operationToTest.parameters[key]}`).join('&')}`
                    : undefined
                const endpoint = `${operationToTest.type ? server.url : ''}${operationToTest.endpoint}${operationToTest.path}${parameters ? parameters : ''}`;
                const url = !operationToTest.type ? `${server.url}/proxy/${encodeURIComponent(endpoint)}/${operationToTest.apiId}` : endpoint;

                const opts: AxiosRequestConfig = {
                    method: operationToTest.method as Method,
                    url,
                    ...(operationToTest.data && {data: operationToTest.data}),
                    headers: {
                        "Authorization": `Bearer ${server.token}`,
                        ...operationToTest.headers
                    },
                    ...(operationToTest.data && {data: operationToTest.data})
                };

                const response = await axios(opts);

                const runtimeEnd = new Date().getTime();
                const runtime = runtimeEnd - runtimeStart;
                if (operationToTest.statusCode) {
                    expect(response.status).toBe(+operationToTest.statusCode);
                }

                if (operationToTest.jestMaxRuntime) {
                    expect(runtime).toBeLessThan(operationToTest.jestMaxRuntime);
                }

                if (operationToTest.jestMatchName && operationToTest.jestMatchValue) {
                    expect(findValue(response, operationToTest.jestMatchName))[operationToTest.jestMatchOperation](operationToTest.jestMatchValue);
                }
            });
        });
    }
}
