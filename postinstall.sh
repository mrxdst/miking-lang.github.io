echo "Updating modules/miking"

git submodule update --init ./modules/miking

echo "Bootstrapping mi compiler"

make -C modules/miking

echo "Building playground compiler"

MCORE_LIBS=stdlib=$(pwd)/modules/miking/src/stdlib ./modules/miking/build/mi compile ./src/playground/compiler.mc --to-es --output ./src/playground/compiler.mjs
sed -i "s|$(pwd)|.|g" ./src/playground/compiler.mjs
