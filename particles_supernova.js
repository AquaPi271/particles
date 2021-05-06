var particle_color = [1.0, 1.0, 0.0];

const mode_points = 1;
const mode_lines = 2;

var particle_count = 200;
var gen_probability = 0.1;

var g_delta_t = 0.005;  // time step

var particle_system = null;

// Graphics

var canvas = null;
var gl = null;
var clear_color = [0.0,0.0,0.0,1.0];
var shader_program = null;
var attribute_vertex = null;
var attribute_color = null;
var uniform_mode = null;

var acceleration = -1.0;

class ParticleSN {
    constructor(
        x,
        y,
        z,
        initial_speed,
        dir_x,
        dir_y,
        dir_z,
        rule,
        color
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
        
        this.dir_x = dir_x;
        this.dir_y = dir_y;
        this.dir_z = dir_z;

        var dir_length = Math.sqrt(this.dir_x*this.dir_x + this.dir_y*this.dir_y + this.dir_z*this.dir_z);
        this.dir_x = dir_x / dir_length;
        this.dir_y = dir_y / dir_length;
        this.dir_z = dir_z / dir_length;

        this.speed = initial_speed;
        this.vx = this.speed * this.dir_x;
        this.vy = this.speed * this.dir_y;
        this.vz = this.speed * this.dir_z;

        this.acceleration = acceleration;
        this.ax = this.acceleration * this.dir_x;
        this.ay = this.acceleration * this.dir_y;
        this.az = this.acceleration * this.dir_z;

        this.rule = rule;
        this.color = color.slice();

        this.alive = true;
    }

    clone( ) {
        var particle = new ParticleSN(this.x, this.y, this.z, 
                                      this.speed,
                                      this.dir_x, this.dir_y, this.dir_z,
                                      this.rule, this.color);
        particle.alive = this.alive;
        return( particle );
    }

    is_dead() {
        return !this.alive;
    }

    update(delta_t) {

        this.speed += (this.acceleration * delta_t);

        if( this.speed <= 0.0 ) {
            this.alive = false;
        }

        this.vx += (this.ax * delta_t);
        this.vy += (this.ay * delta_t);
        this.vz += (this.az * delta_t);

        this.x += (this.vx * delta_t);
        this.y += (this.vy * delta_t);
        this.z += (this.vz * delta_t);

    }

    static generate_random_particle(particle_color) {
        // var radius = (radius_max-radius_min) * Math.random() + radius_min;
        // var angle  = (2*Math.PI) * Math.random();
        // var eccen  = (eccen_max - eccen_min) * Math.random() + eccen_min;
        // var mass   = (mass_max - mass_min) * Math.random() + mass_min;

        // var circular_tangent_velocity = Math.sqrt( G * sun_mass / radius ) * eccen;
        // // Point on circle is:
        // var px = radius * Math.cos(angle);
        // var py = radius * Math.sin(angle);
        // // Tangent vector is:
        // var diff_x = px - sun_x;
        // var diff_y = py - sun_y;
        // // TODO: Does not handle 3D yet.
        // var line_dir_x = -1.0 * diff_y;
        // var line_dir_y = diff_x;
        // if( Math.random() < flipped_orbit_probability ) {
        //     line_dir_x *= -1.0;
        //     line_dir_y *= -1.0;
        // }
        // var vec_length = Math.sqrt((line_dir_x**2) + (line_dir_y**2));
        // line_dir_x = line_dir_x / vec_length;
        // line_dir_y = line_dir_y / vec_length;
        // var vx = circular_tangent_velocity * line_dir_x;
        // var vy = circular_tangent_velocity * line_dir_y;
        // var radius = Particle.compute_radius( mass_min, mass_max, mass, min_radius, max_radius );

        var dir_x = 0.0;
        var dir_y = 0.0;
        var dir_z = 0.0;

        while( 1 ) {
            dir_x = 2.0 * Math.random() - 1.0; 
            dir_y = 2.0 * Math.random() - 1.0; 
            dir_z = 2.0 * Math.random() - 1.0; 
            if( dir_x*dir_x + dir_y*dir_y + dir_z*dir_z <= 1.0 ) {
                break;
            }
        }

        var particle = new ParticleSN( 0.0, 0.0, 0.0, 1.0, dir_x, dir_y, 0.0, 1, particle_color);
        return( particle );
    }
}

class ParticleSystemSN {
    constructor(
        gl,
        particle_capacity
    ) {
        this.particle_capacity = particle_capacity;
        this.gl_vertex_buffer = gl.createBuffer();
        this.gl_vertex_color_buffer = gl.createBuffer();
        this.vertex_buffer = new Float32Array(this.particle_capacity * 3);
        this.vertex_color_buffer = new Float32Array(this.particle_capacity * 3);
        this.particles = [];
    }
    add_particle( particle ) {
        while( this.particles.length >= this.particle_capacity ) {
            this.particle_capacity *= 2;
        }
        this.vertex_buffer = new Float32Array(this.particle_capacity * 3);
        this.vertex_color_buffer = new Float32Array(this.particle_capacity * 3);

        this.particles.push( particle.clone() );
        return(true);
    }
    draw(gl) {
        var index = 0;
        for( var p = 0; p < this.particles.length; ++p ) {
            this.vertex_color_buffer[index] = this.particles[p].color[0]; 
            this.vertex_buffer[index++] = this.particles[p].x;
            this.vertex_color_buffer[index] = this.particles[p].color[1]; 
            this.vertex_buffer[index++] = this.particles[p].y;
            this.vertex_color_buffer[index] = this.particles[p].color[2]; 
            this.vertex_buffer[index++] = this.particles[p].z;
        }
        gl.uniform1i(uniform_mode, mode_points);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertex_buffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attribute_vertex,3,gl.FLOAT,false,0,0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vertex_color_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertex_color_buffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attribute_color,3,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.POINTS,0,this.particles.length);
    }

    update( delta_t ) {
        // Simple linear loop.
        var delete_particle_indices = [];
        for( var p = 0; p < this.particles.length; ++p ) {
            var particle = this.particles[p];
            particle.update(g_delta_t);
            if( particle.is_dead() ) {
                delete_particle_indices.push(p);
            }
        }
        this.delete_particles( delete_particle_indices );
        // Make a new batch?

        if( Math.random() < gen_probability ) {
            var random_color = [Math.random(), Math.random(), Math.random()];
            for( var c = 0; c < particle_count; ++c ) {
                var p = null;
                p = ParticleSN.generate_random_particle( random_color );
                particle_system.add_particle( p );
            }
        }
    }

    delete_particles( delete_indices ) {
        delete_indices.sort(function(a,b) {
            return b - a;
        });
        for( var di = 0; di < delete_indices.length; ++di ) {
            this.particles.splice(delete_indices[di],1);
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
        }
    }
    
    catch(e) {
        console.log(e);
    }
}

function setup_shaders( ) {

    var vertex_shader_source = `
        precision mediump float;
        uniform int mode;
        attribute vec3 vertex_position;
        attribute vec3 a_color;
        varying vec3 v_color;

        void main(void) {
            gl_PointSize = 3.0;
            gl_Position = vec4(vertex_position,1.0);
            v_color = a_color;
        }
    `;

    var fragment_shader_source = `
        precision mediump float;
        uniform int mode;
        varying lowp vec3 v_color;
        void main(void) {    
            if( mode == 1 ) {
                //gl_FragColor = vec4(0.0,1.0,0.0,1.0);
                gl_FragColor = vec4(v_color,1.0);
            } else {
                //gl_FragColor = vec4(1.0,0.0,0.0,1.0);
                gl_FragColor = vec4(v_color,1.0);
            }
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
        attribute_color = gl.getAttribLocation(shader_program, "a_color");
        uniform_mode = gl.getUniformLocation(shader_program, "mode");
        gl.enableVertexAttribArray(attribute_vertex);
        gl.enableVertexAttribArray(attribute_color);
    }

    catch(e) {
        console.log(e);
    }
}

function render_scene( ) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.viewport(0,0, canvas.width, canvas.height);
    
    particle_system.update(g_delta_t);
    particle_system.draw(gl);

    window.requestAnimationFrame(render_scene);
}

function main() {

    setup_webgl();

    setup_shaders();

    particle_system = new ParticleSystemSN(gl, particle_count);
    var random_color = [Math.random(), Math.random(), Math.random()];
    for( var c = 0; c < particle_count; ++c ) {
        var p = null;
        p = ParticleSN.generate_random_particle( random_color );
        particle_system.add_particle( p );
    }

    render_scene();
}
