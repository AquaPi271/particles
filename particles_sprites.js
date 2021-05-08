"use strict";

// Globals

var particle_count           = 1000;
var particles                = [];

// Webgl globals

var gl                        = null;                                   // graphics object
var vec4_clear_color          = vec4.fromValues( 0.0, 0.0, 0.0, 1.0 );  // color for clearing canvas
var shader_program            = null;                                   // compiled shader program

var sprite_gl_buffer          = null;
var sprite_vertex_buffer      = null;
var sprite_gl_uv_buffer       = null;
var sprite_uv_buffer          = null;

var mass_texture              = null;

// Projection and camera

var camera                    = null;
var camera_move_increment     = 0.15;
var camera_angle_increment    = 6.0;

var camera_start_location     = [0.0, 0.0, 1.0];
var camera_start_forward      = [0.0, 0.0, -1.0];
var camera_start_right        = [1.0, 0.0, 0.0];
var camera_start_up           = [0.0, 1.0, 0.0];

var mat4_projection_matrix    = mat4.create();
var near_clip_plane_distance  = 0.1;
var far_clip_plane_distance   = 10.0;

// Shader variables

var attr_vertex_position      = null;                                   // attribute to vertex buffer
var uniform_projection_matrix = null;
var attr_vertex_uv            = null;
var uniform_texture           = null;

// HTML globals

var canvas = null;       // HTML canvas to render WebGL

var sprite_location = vec3.fromValues( 0.0, 0.0, -1.0 );


function handle_key_down(event) {
    if( camera == null ) {
        return;
    }

    if (!event.shiftKey) {
        switch (event.code) {
            case "KeyA":
                camera.move_right(-1.0*camera_move_increment);  // X-Handedness is backwards
                break;
            case "KeyD":
                camera.move_left(-1.0*camera_move_increment);   // X-Handedness is backwards
                break;
            case "KeyS":
                camera.move_backward(camera_move_increment);
                break;
            case "KeyW":
                camera.move_forward(camera_move_increment);
                break;
            case "KeyQ":
                camera.move_up(camera_move_increment);
                break;
            case "KeyE":
                camera.move_down(camera_move_increment);
                break;
            case "ArrowLeft":
                camera.rotate_left(camera_angle_increment);
                break;
            case "ArrowRight":
                camera.rotate_right(camera_angle_increment);
                break;
            case "ArrowDown":
                camera.move_backward(camera_move_increment);
                break;
            case "ArrowUp":
                camera.move_forward(camera_move_increment);
                break;
        }
    } else if(event.shiftKey) {
        switch (event.code) {
            case "KeyA":
                camera.rotate_left(camera_angle_increment);
                break;
            case "KeyD":
                camera.rotate_right(camera_angle_increment);
                break;
            case "KeyS":
                camera.rotate_backward(camera_angle_increment);
                break;
            case "KeyW":
                camera.rotate_forward(camera_angle_increment);
                break;
            case "KeyQ":
                camera.rotate_clockwise(camera_angle_increment);
                break;
            case "KeyE":
                camera.rotate_counterclockwise(camera_angle_increment);
                break;
        }
    }
}

function setup_webgl() {

    // Set up keys
    document.onkeydown = handle_key_down; // call this when key pressed

    canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");
    try {
        if( gl == null ) {
            throw "unable to get the webgl context from the browser page";
        } else {
            gl.clearColor( vec4_clear_color[0], vec4_clear_color[1], vec4_clear_color[2], vec4_clear_color[3] );
            gl.clearDepth( 1.0 );
            gl.enable( gl.DEPTH_TEST );
        }
    }
    
    catch(e) {
        console.log(e);
    }

    mat4.perspective(mat4_projection_matrix, 0.5 * Math.PI, canvas.width/canvas.height, near_clip_plane_distance, far_clip_plane_distance );

}

function setup_shaders() {

    // define vertex shader in essl using es6 template strings
    var vertex_shader_source = `
        attribute vec3 attr_vertex_position; // vertex position
        attribute vec2 attr_vertex_uv;       // vertex texture uv

        uniform mat4 uniform_projection_matrix;   // projection matrix only (for billboarding must run camera outside of shader) 

        varying vec2 vary_vertex_uv;         // interpolated uv for frag shader

        void main(void) {
    
            // vertex position

            gl_Position = uniform_projection_matrix * vec4(attr_vertex_position, 1.0);

            // vertex uv

            vary_vertex_uv = attr_vertex_uv;
        }
    `;

    // define fragment shader in essl using es6 template strings
    var fragment_shader_source = `
        precision mediump float; // set float to medium precision
        
        // texture properties
        //uniform bool uUsingTexture; // if we are using a texture
        uniform sampler2D uniform_texture; // the texture for the fragment
        varying vec2 vary_vertex_uv; // texture uv of fragment
            
        void main(void) {
            vec4 tex_color = texture2D(uniform_texture, vec2(vary_vertex_uv.s, vary_vertex_uv.t));

            gl_FragColor = tex_color;
            //if( gl_FragColor.a < 0.1 ) {
            //  discard;
            //}
        } // end main
    `;

    // Compile and link the shaders.
    try {
        var vertex_shader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertex_shader, vertex_shader_source);
        gl.compileShader(vertex_shader);

        var fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragment_shader, fragment_shader_source);
        gl.compileShader(fragment_shader);

        if( !gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS)) {
            throw "vertex shader compiler failure: " + gl.getShaderInfoLog(vertex_shader);
        } else if( !gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS)) {
            throw "fragment shader compiler failure: " + gl.getShaderInfoLog(fragment_shader);
        } 

        shader_program = gl.createProgram();
        gl.attachShader(shader_program, vertex_shader);
        gl.attachShader(shader_program, fragment_shader);
        gl.linkProgram(shader_program);

        if( !gl.getProgramParameter(shader_program, gl.LINK_STATUS)) {
            throw "error when linking shader program: " + gl.getProgramInfoLog(shader_program);
        }

        gl.useProgram( shader_program );
        attr_vertex_position = gl.getAttribLocation(shader_program, "attr_vertex_position");
        gl.enableVertexAttribArray(attr_vertex_position);
        attr_vertex_uv = gl.getAttribLocation(shader_program, "attr_vertex_uv");
        gl.enableVertexAttribArray(attr_vertex_uv);

        // Get the uniform variables from the shaders

        uniform_projection_matrix = gl.getUniformLocation(shader_program, "uniform_projection_matrix"); 
        uniform_texture = gl.getUniformLocation(shader_program, "uniform_texture");
        //uniform_mode = gl.getUniformLocation(shader_program, "mode");
    }

    catch(e) {
        console.log(e);
    }
}

function generate_mass_texture( gl ) {

    // Make a simple circle for now.  Possible include gradient later.
    // Empty spots must be fully transparent.

    var mass_texture = gl.createTexture();
    var width = 64;   
    var height = 64;  
    var data = [];
    var data2D = new Array(width);
    var circle_color = [255,255,255,255];
    
    for( var y = 0; y < height; ++y ) {
	    data2D[y] = new Array(height);
    }

    // Initialize to fully transparent black.
    
    for( var y = 0; y < height; ++y ) {
	    for( var x = 0; x < width; ++x ) {
	        data2D[x][y] = [0,0,0,0];
	    }
    }

    // Draw circle.
    
    var mid_y = height / 2.0;
    var mid_x = width / 2.0;

    for( var y = 0; y < height; ++y ) {
        for( var x = 0; x < width; ++x ) {
            var distance_squared = (x - mid_x)**2 + (y - mid_y)**2;
            if( distance_squared < 32.0 * 32.0 ) {
                data2D[x][y] = circle_color;
            }
        }
    }

    // Flatten elements into RGBA quads.
    
    for( var y = 0; y < height; ++y ) {
	    for( var x = 0; x < width; ++x ) {
	        var ele = data2D[x][y];
	        data.push( ele[0] );
	        data.push( ele[1] );
	        data.push( ele[2] );
	        data.push( ele[3] );
	    }
    }
    var data_typed = new Uint8Array(data);
    gl.bindTexture(gl.TEXTURE_2D, mass_texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data_typed);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return( mass_texture );

}

function update_sprite_vertices_from_point( sprite_vertex_buffer, vec4_point, sprite_uv_buffer, index, uv_index ) {

    // Make a square from two rectangles and place a Z=0 for now.

    var radius = 0.02;

    var UL = vec3.fromValues( -1.0 * radius + vec4_point[0],        radius + vec4_point[1], vec4_point[2] );
    var UR = vec3.fromValues(        radius + vec4_point[0],        radius + vec4_point[1], vec4_point[2] );
    var LL = vec3.fromValues( -1.0 * radius + vec4_point[0], -1.0 * radius + vec4_point[1], vec4_point[2] );
    var LR = vec3.fromValues(        radius + vec4_point[0], -1.0 * radius + vec4_point[1], vec4_point[2] );

    var UL_uv = vec2.fromValues( 0.0, 1.0 );
    var UR_uv = vec2.fromValues( 1.0, 1.0 );
    var LL_uv = vec2.fromValues( 0.0, 0.0 );
    var LR_uv = vec2.fromValues( 1.0, 0.0 );

    // First triangle.

    sprite_vertex_buffer[index++] = UL[0];  sprite_uv_buffer[uv_index++] = UL_uv[0];
    sprite_vertex_buffer[index++] = UL[1];  sprite_uv_buffer[uv_index++] = UL_uv[1];
    sprite_vertex_buffer[index++] = UL[2];
    sprite_vertex_buffer[index++] = UR[0];  sprite_uv_buffer[uv_index++] = UR_uv[0];
    sprite_vertex_buffer[index++] = UR[1];  sprite_uv_buffer[uv_index++] = UR_uv[1];
    sprite_vertex_buffer[index++] = UR[2];
    sprite_vertex_buffer[index++] = LL[0];  sprite_uv_buffer[uv_index++] = LL_uv[0];
    sprite_vertex_buffer[index++] = LL[1];  sprite_uv_buffer[uv_index++] = LL_uv[1];
    sprite_vertex_buffer[index++] = LL[2];  

    // Second triangle.
    
    sprite_vertex_buffer[index++] = UR[0];  sprite_uv_buffer[uv_index++] = UR_uv[0];
    sprite_vertex_buffer[index++] = UR[1];  sprite_uv_buffer[uv_index++] = UR_uv[1];
    sprite_vertex_buffer[index++] = UR[2];
    sprite_vertex_buffer[index++] = LR[0];  sprite_uv_buffer[uv_index++] = LR_uv[0];
    sprite_vertex_buffer[index++] = LR[1];  sprite_uv_buffer[uv_index++] = LR_uv[1];
    sprite_vertex_buffer[index++] = LR[2];
    sprite_vertex_buffer[index++] = LL[0];  sprite_uv_buffer[uv_index++] = LL_uv[0];
    sprite_vertex_buffer[index++] = LL[1];  sprite_uv_buffer[uv_index++] = LL_uv[1];
    sprite_vertex_buffer[index++] = LL[2];

    return( [index, uv_index] );

}

function render_scene() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    gl.depthMask(false);

    var vec4_transformed_point = vec4.create();
    vec4.transformMat4( vec4_transformed_point, vec4.fromValues(sprite_location[0], sprite_location[1], sprite_location[2], 1.0), camera.get_camera_matrix() );
    update_sprite_vertices_from_point( sprite_vertex_buffer, vec4_transformed_point, sprite_uv_buffer );

    var vertex_index = 0;
    var uv_index = 0;
    for( var i = 0; i < particle_count; ++i ) {
        var particle = particles[i];
        var vec4_transformed_point = vec4.create();   
        vec4.transformMat4( vec4_transformed_point, vec4.fromValues(particle[0], particle[1], particle[2], 1.0), camera.get_camera_matrix() );        
        var indices = update_sprite_vertices_from_point( sprite_vertex_buffer, vec4_transformed_point, sprite_uv_buffer, vertex_index, uv_index );
        vertex_index = indices[0];
        uv_index = indices[1];
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, mass_texture);
    gl.uniform1i(uniform_texture, 0);

    gl.uniformMatrix4fv(uniform_projection_matrix, false, mat4_projection_matrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, sprite_gl_uv_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, sprite_uv_buffer, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attr_vertex_uv,2,gl.FLOAT,false,0,0);

    gl.bindBuffer(gl.ARRAY_BUFFER, sprite_gl_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, sprite_vertex_buffer, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attr_vertex_position,3,gl.FLOAT,false,0,0);

    gl.drawArrays(gl.TRIANGLES,0,6*particle_count);
    
    window.requestAnimationFrame(render_scene);
}

function main() {
    
    camera = new Camera(camera_start_location, camera_start_forward, camera_start_up, camera_start_right );

    setup_webgl();
    setup_shaders();
    sprite_gl_buffer = gl.createBuffer();
    sprite_vertex_buffer = new Float32Array(2 * 3 * 3 * particle_count);
    
    sprite_gl_uv_buffer = gl.createBuffer();
    sprite_uv_buffer = new Float32Array(2 * 3 * 2 * particle_count);

    mass_texture = generate_mass_texture(gl);

    for( var i = 0; i < particle_count; ++i ) {
        var x = -2.0 * Math.random() + 1.0;
        var y = -2.0 * Math.random() + 1.0;
        var z = -2.0 * Math.random() + 1.0;
        particles.push( [x, y, z] );
    }

    render_scene();
}