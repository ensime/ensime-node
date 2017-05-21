const gulp = require('gulp');
const ts = require('gulp-typescript');
const tslint = require('gulp-tslint');
const merge = require('merge2');
const sourcemaps = require('gulp-sourcemaps');
const coffee = require('gulp-coffee');
const coffeelint = require('gulp-coffeelint');
const jasmine = require('gulp-jasmine');
const rimraf = require('rimraf');
const runSequence = require('run-sequence');
const tsProject = ts.createProject('tsconfig.json');

function compileTs() {
    const tsResult = tsProject.src() 
        .pipe(sourcemaps.init())
        .pipe(tsProject());
 
    return merge([
        tsResult.dts
            .pipe(gulp.dest('release/definitions')),
        tsResult.js
            .pipe(sourcemaps.write()) 
            .pipe(gulp.dest('release/js'))
    ]); 
}

gulp.task('compile-ts', compileTs);

gulp.task('ts-lint', () => 
    gulp.src('src/lib/**/*.ts')
        .pipe(tslint({
            formatter: "verbose"
        }))
        .pipe(tslint.report())
);

// Just copy js to dist folder
gulp.task('copy-js', () => 
    gulp.src('./src/**/*.js')
        .pipe(gulp.dest('release/js'))
);

gulp.task('integration', ['build', 'it']);

gulp.task('it', () => gulp.src('./release/js/spec-integration/**/*.js').pipe(jasmine()));

gulp.task('test', () => {
    console.log("starting tests…");
	return gulp.src('./release/js/spec/**/*.js').pipe(jasmine({includeStackTrace: false}));
});

gulp.task('compile', ['compile-ts']);
gulp.task('build', ['compile', 'copy-js']);
gulp.task('lint', ['ts-lint']);

gulp.task('clean', cb => rimraf('./release', cb));


gulp.task('default', cb => runSequence(['clean, build'], cb));

gulp.task('watch', ['build'], cb => {
    gulp.watch('src/**/*.ts', vinyl => runSequence('compile-ts', 'test', () => {}));
});
