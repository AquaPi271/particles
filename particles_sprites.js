"use strict";

// Webgl globals

var gl                        = null;                                   // graphics object
var vec4_clear_color          = vec4.fromValues( 0.0, 0.0, 0.0, 1.0 );  // color for clearing canvas
var shader_program            = null;                                   // compiled shader program

var sprite_gl_buffer          = null;
var sprite_vertex_buffer      = null;

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

// HTML globals

var canvas = null;       // HTML canvas to render WebGL



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
        //attribute vec2 aVertexUV;       // vertex texture uv

        uniform mat4 uniform_projection_matrix;   // projection matrix only (for billboarding must run camera outside of shader) 

        //varying vec3 vWorldPos;         // interpolated world position of vertex
        //varying vec2 vVertexUV;         // interpolated uv for frag shader

        void main(void) {
    
            // vertex position
            //vWorldPos = attr_vertex_position;   // everything is already in global coordinates
            //gl_Position = upvmMatrix * vec4(attr_vertex_position), 1.0);  // move to camera space!

            gl_Position = uniform_projection_matrix * vec4(attr_vertex_position, 1.0);

            // vertex uv
            //vVertexUV = aVertexUV;
        }
    `;

    // define fragment shader in essl using es6 template strings
    var fragment_shader_source = `
        precision mediump float; // set float to medium precision
        
        // texture properties
        //uniform bool uUsingTexture; // if we are using a texture
        //uniform sampler2D uTexture; // the texture for the fragment
        //varying vec2 vVertexUV; // texture uv of fragment
            
        // geometry properties
        //varying vec3 vWorldPos; // world xyz of fragment
        
        void main(void) {
            
        //     // combine to find lit color
        //     vec3 litColor = ambient + diffuse + specular; 
        //     if (!uUsingTexture) {
        //         gl_FragColor = vec4(litColor, 1.0);
        //     } else {
        //         // Hmmmm.... vVertexUV is ALREADY vec2, this vec2 necessary here?
        //         vec4 texColor = texture2D(uTexture, vec2(vVertexUV.s, vVertexUV.t));
            
        //         // gl_FragColor = vec4(texColor.rgb * litColor, texColor.a);

        //         // My Tetris game used the following:
        //         // gl_FragColor = vec4(color_sum,1.0) * texture2D(u_texture_sampler, v_tex_coord);

        //         gl_FragColor = vec4(texColor.rgb * litColor, 1.0);
        //       //  gl_FragColor = vec4(texColor.rgb, 1.0);
        //    } // end if using texture

            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
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

        // Get the uniform variables from the shaders

        uniform_projection_matrix = gl.getUniformLocation(shader_program, "uniform_projection_matrix"); // ptr to pvmmat
        //uniform_mode = gl.getUniformLocation(shader_program, "mode");
    }

    catch(e) {
        console.log(e);
    }
}

function add_sprite_vertices( sprite_vertex_buffer ) {

    // Make a square from two rectangles and place a Z=0 for now.

    var z = -1.0;
    var scale = 1.0;

    var UL = vec3.fromValues( scale*-0.5, scale*0.5, z);
    var UR = vec3.fromValues( scale*0.5, scale*0.5, z);
    var LL = vec3.fromValues( scale*-0.5, scale*-0.5, z);
    var LR = vec3.fromValues( scale*0.5, scale*-0.5, z);

    var index = 0;

    // First triangle.

    sprite_vertex_buffer[index++] = UL[0];
    sprite_vertex_buffer[index++] = UL[1];
    sprite_vertex_buffer[index++] = UL[2];
    sprite_vertex_buffer[index++] = UR[0];
    sprite_vertex_buffer[index++] = UR[1];
    sprite_vertex_buffer[index++] = UR[2];
    sprite_vertex_buffer[index++] = LL[0];
    sprite_vertex_buffer[index++] = LL[1];
    sprite_vertex_buffer[index++] = LL[2];

    // Second triangle.
    
    sprite_vertex_buffer[index++] = UR[0];
    sprite_vertex_buffer[index++] = UR[1];
    sprite_vertex_buffer[index++] = UR[2];
    sprite_vertex_buffer[index++] = LR[0];
    sprite_vertex_buffer[index++] = LR[1];
    sprite_vertex_buffer[index++] = LR[2];
    sprite_vertex_buffer[index++] = LL[0];
    sprite_vertex_buffer[index++] = LL[1];
    sprite_vertex_buffer[index++] = LL[2];

}

function render_scene() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    var mat4_pc_matrix = mat4.create();

    mat4.multiply( mat4_pc_matrix, mat4_projection_matrix, camera.get_camera_matrix() );

    //gl.uniformMatrix4fv(uniform_projection_matrix, false, mat4_projection_matrix);
    gl.uniformMatrix4fv(uniform_projection_matrix, false, mat4_pc_matrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, sprite_gl_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, sprite_vertex_buffer, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(attr_vertex_position,3,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    
    window.requestAnimationFrame(render_scene);
}

function main() {
    
    camera = new Camera(camera_start_location, camera_start_forward, camera_start_up, camera_start_right );

    setup_webgl();
    setup_shaders();
    sprite_gl_buffer = gl.createBuffer();
    sprite_vertex_buffer = new Float32Array(2 * 3 * 3);
    add_sprite_vertices( sprite_vertex_buffer );

    //mat4.multiply( )

    render_scene();
}