// import-block
import {
	FogExp2,
	PCFSoftShadowMap,
	PerspectiveCamera,
	Scene,
	Vector3,
	WebGLRenderer
} from 'three';

import { OrbitControls } from './helpers/OrbitControls.js';

import * as postprocessing from './modules/composer.js';
import * as settings from './modules/settings.js';
import * as dom from './modules/dom.js';
import * as lights from './modules/lights.js';
import * as floor from './modules/floor.js';
import * as fbo from './modules/fbo.js';
import * as particles from './modules/particles.js';

// defines-block
let w, h,
	renderer, scene, camera, controls,
	isGPU = true,
	loading = true,
	fboLoaded = false,
	particlesLoaded = false,
	postprocessingLoaded = false,
	sceneComplete = false;

const stPos = new Vector3( 0, 200, - 0.1 );

function start() {

	// init-renderer-block
	try {

		renderer = new WebGLRenderer( { antialias: true, failIfMajorPerformanceCaveat: true } );

	} catch ( err ) {

		console.error( "Atomize • Hardware Acceleration not enabled or GPU not available." );
		isGPU = false;

	}

	if ( ! isGPU || ! WEBGL.isWebGLAvailable() ) {

		console.warn( "Atomize • Initialization aborted." );
		dom.showError();
		return;

	}

	isGPU = true;

	w = window.innerWidth;
	h = window.innerHeight;

	renderer.setSize( w, h );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( 0x020406 );

	renderer.sortObjects = false;
	renderer.shadowMap.type = PCFSoftShadowMap;
	renderer.shadowMap.enabled = true;

	document.body.appendChild( renderer.domElement );

	scene = new Scene();
	scene.fog = new FogExp2( 0x020406, 0.0016 );

	camera = new PerspectiveCamera( 75, w / h, 1, 10000 );
	camera.position.copy( stPos );

	controls = new OrbitControls( camera, renderer.domElement );
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.enableRotate = false;
	controls.rotateSpeed = 0.02;
	controls.update();

	const gl = renderer.getContext();

	let precision = 'lowp';
	if ( gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.MEDIUM_FLOAT ).precision > 0 &&
		gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT ).precision > 0 ) {

		precision = 'mediump';

	}
	if ( gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.HIGH_FLOAT ).precision > 0 &&
				gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT ).precision > 0 ) {

		precision = 'highp';

	}

	settings.update( 'precision', precision );

	load();
	requestAnimationFrame( animate ); // start

}

function load() {

	lights.init();
	floor.init();

	scene.add( lights.mesh );
	scene.add( floor.mesh );

	fbo.init( renderer, camera ).then( ( status ) => {

		fboLoaded = status;

	} );

	particles.init( camera ).then( ( status ) => {

		particlesLoaded = status;

	} );

	postprocessing.init( renderer, scene, camera, w, h ).then( ( status ) => {

		postprocessingLoaded = status;

	} );

	dom.init( camera, controls );

}

function loadParticles() {

	scene.add( particles.mesh );
	sceneComplete = true;

}

function restart() {

	scene.remove( particles.mesh );

	settings.update( 'restart', false );
	fbo.init( renderer, camera );
	particles.init( camera );

	scene.add( particles.mesh );

}

function animate() {

	if ( settings.options.restart ) restart();

	requestAnimationFrame( animate );

	loading = ( ! fboLoaded || ! particlesLoaded || ! postprocessingLoaded );

	if ( ! loading && ! sceneComplete ) {

		loadParticles();

	}

	update();

	render();

}

function update() {

	dom.update();

	if ( sceneComplete ) {

		controls.update();
		fbo.update();
		particles.update();

	}

}

function render( ) {

	if ( sceneComplete ) {

		postprocessing.render();

	} else {

		renderer.render( scene, camera );

	}

}

window.onresize = function () {

	if ( ! isGPU ) return;

	w = window.innerWidth;
	h = window.innerHeight;

	camera.aspect = w / h;
	camera.updateProjectionMatrix();

	renderer.setSize( w, h );
	postprocessing.setSize( w, h );

};

start();
