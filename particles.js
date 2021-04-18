

//mat4.perspective(projection_matrix, 0.5 * Math.PI, canvas.width/canvas.height, near_clip_plane_distance, far_clip_plane_distance );


var canvas = null;
var gl = null;
var clear_color = [0.0,0.0,0.0,1.0];
var shader_program = null;
var attribute_vertex = null;

// Temporarily place vertices here:
//
var vertex_buffer = new Float32Array(3);
vertex_buffer[0] = -0.5;
vertex_buffer[1] = 0.0;
vertex_buffer[2] = 0.0;
var gl_vertex_buffer = null;

var particle_system = null;

class Particle {
    constructor(
        x,
        y,
        z,
        y_offset
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.y_offset = y_offset;
    }

    clone( ) {
        return( new Particle(this.x, this.y, this.z, this.y_offset) );
    }

    update_old( delta_t ) {
        this.x += 0.01 * delta_t;
        if( this.x >= 1.0 ) {
            this.x = -1.0;
        }
    }
    update( delta_t ) {
        this.x += 0.01 * delta_t;
        this.y = this.y_offset + Math.sin(this.x * Math.PI);
        if( this.x >= 1.0 ) {
            this.x = -1.0 + this.x - 1.0;
        }
    }

}

class ParticleSystem {
    constructor(
        gl,
        particle_count
    ) {
        this.particle_count = particle_count;
        this.gl_vertex_buffer = gl.createBuffer();
        this.vertex_buffer = new Float32Array(this.particle_count * 3);
        this.particles = [];
    }
    add_particle( particle ) {
        if( this.particles.length >= this.particle_count ) {
            return(false);
        }
        this.particles.push( particle.clone() );
        return(true);
    }
    draw(gl) {
        var index = 0;
        for( var p = 0; p < this.particles.length; ++p ) {
            this.vertex_buffer[index++] = this.particles[p].x;
            this.vertex_buffer[index++] = this.particles[p].y;
            this.vertex_buffer[index++] = this.particles[p].z;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertex_buffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attribute_vertex,3,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.POINTS,0,this.particles.length);
    }
    update( delta_t ) {
        for( var p = 0; p < this.particles.length; ++p ) {
            this.particles[p].update(delta_t);
        }
    }
}

function setup_webgl() {
    canvas = document.getElementById("myWebGLCanvas");
    gl = canvas.getContext("webgl");
    try {
        if( gl == null ) {
            throw "unable to get the webgl context from the browser page";
        } else {
            gl.clearColor( clear_color[0], clear_color[1], clear_color[2], clear_color[3] );
            gl.clearDepth( 1.0 );
            gl.enable( gl.DEPTH_TEST );
            gl_vertex_buffer = gl.createBuffer();
        }
    }
    
    catch(e) {
        console.log(e);
    }
}

function setup_shaders( ) {

    var vertex_shader_source = `
        precision mediump float;
        attribute vec3 vertex_position;

        void main(void) {
            gl_PointSize = 3.0;
            gl_Position = vec4(vertex_position,1.0);
        }
    `;

    var fragment_shader_source = `
        precision mediump float;
        void main(void) {    
            gl_FragColor = vec4(1.0,1.0,1.0,1.0);
        }
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
        attribute_vertex = gl.getAttribLocation(shader_program, "vertex_position");
        gl.enableVertexAttribArray(attribute_vertex);
    }

    catch(e) {
        console.log(e);
    }
}

function render_scene( ) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0,0, canvas.width, canvas.height);
    
    // gl.bindBuffer(gl.ARRAY_BUFFER, gl_vertex_buffer);
    // gl.bufferData(gl.ARRAY_BUFFER, vertex_buffer, gl.DYNAMIC_DRAW);
    // gl.vertexAttribPointer(attribute_vertex,3,gl.FLOAT,false,0,0);
    // gl.drawArrays(gl.POINTS,0,1);

    particle_system.update(1.0);
    particle_system.draw(gl);

    window.requestAnimationFrame(render_scene);
}

function main() {
    setup_webgl();

    setup_shaders();

    var particle_count = 1000;

    particle_system = new ParticleSystem(gl, particle_count);
    for( var c = 0; c < particle_count; ++c ) {
        var rx = 2*Math.random() - 1.0;
        particle_system.add_particle( new Particle( rx, 0.0, 0.0, -1.0 + 2*Math.random() ) );
    }

    render_scene();
}
