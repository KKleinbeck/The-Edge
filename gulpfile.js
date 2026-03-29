const gulp = require('gulp');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
const less = require('gulp-less');

/* ----------------------------------------- */
/*  Compile SRC
/* ----------------------------------------- */

function compileProject() {
  return tsProject.src()
    .pipe(tsProject()).js
    .pipe(gulp.dest("./built"))
}

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const SIMPLE_LESS = ["styles/*.less"];
function compileLESS() {
  return gulp.src("styles/*.less")
    .pipe(less())
    .pipe(gulp.dest("./styles/"))
}
const css = gulp.series(compileLESS);

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(SIMPLE_LESS, css);
  gulp.watch(["src/**/*"], compileProject);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(compileProject),
  gulp.parallel(css),
  watchUpdates
);
exports.css = css;
