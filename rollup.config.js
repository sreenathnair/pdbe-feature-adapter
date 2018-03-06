import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
    entry: 'src/index.js',
    name: 'PDBeFeatureAdapter',
    sourceMap: true,
    output: {
        file: 'dist/pdbe-feature-adapter.js',
        format: 'iife',
    },
    plugins: [
        nodeResolve({jsnext: true}),
        babel({
            exclude: 'node_modules/**'
        })
    ],
};