#!/usr/bin/env bash

echo "Running testrpc"

evm="node ../node_modules/.bin/testrpc"
trf="node ../node_modules/.bin/truffle"

${evm} \
--account="0x2b98f714620688157ff568d7421b14bfbd7a4c1a3288d09d9d18c8942cb188f5,999000000000000000000" \
--account="0xa3c276d41fbda47e829aa0dea15c0a64ffc80825c856662ea4d5bc0cd77feb48,999000000000000000000" \
--account="0x15dec882590382962d2caacf93b0caf63e85fc9d76a87aa5d4a1ae17c558688a,999000000000000000000" \
--account="0xec8d1f0a39e3d3b4d35f5adeb230973d4704b07752ab092f3e67e5b7ccae38c6,999000000000000000000" \
--account="0x83c590b3637cea837adfddc3befd014cb4776be6a04d68e03b2a9648f7ddb177,99999000000000000000000" \
--account="0x4a4fefa9f56664da86b8e45c2eb5b0b75ea3e44bda049718f0ae2d1446282709,999000000000000000000" \
--account="0x3f87abc9a84d1e569c4c0ac27bcb27195e03f37d70f577572083c0d716f1f17f,999000000000000000000" \
--account="0x249d54a7395972dd65f0a1653483f643687db734bfc4a4bc7b74d7b599ff2c35,999000000000000000000" \
--account="0x330d24105ec384e544ca975f1737a0b5db77a22f70faf26c6adbb7df10cb5071,999000000000000000000" \
--account="0xd44af54b95bdde3177381198fb824e2d1ed344fe07108d40f577c3130eab5c70,0x0" >/dev/null 2>&1  &

echo "Running tests"
${trf} test $@

echo "Stopping the testrpc ethereum node"
pgrep -f "node_modules/.bin/testrpc" | xargs kill -9
