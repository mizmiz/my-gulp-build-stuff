alert('hello world');

const test = (arg = 'foo') => {
    return `hello ${arg} !`;
};

test();

// Test EsLint
var wrong = [
    `world`,
    'hello'
]

console.log("test");