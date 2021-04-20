

//mat4.perspective(projection_matrix, 0.5 * Math.PI, canvas.width/canvas.height, near_clip_plane_distance, far_clip_plane_distance );


var canvas = null;
var gl = null;
var clear_color = [0.0,0.0,0.0,1.0];
var shader_program = null;
var attribute_vertex = null;

// Temporarily place vertices here:
//
var gl_vertex_buffer = null;

var particle_system = null;
var g_delta_t = 0.00005;

// Universal Law of Gravitation:
//
// Fg = G * m1 * m2 / (r * r)
//
// G = 6.67430 x 10^-11 (N * m * m) / (kg * kg)
const G = 1.0; // barely any gravity

// 
// 
// Fsun_earth = G * Mearth * Msun / (r*r)
//            = 6.67430 x 10^-11 * 5.9720 * 10^24 kg * 1.9891 * 10^30 kg / (149.6 * 10^9 m)^2
//            = 3.5425742 x 10^22 N
//            
// Asun       = 3.5425742 x 10^22 N / 1.9891 * 10^30 kg = 1.78e-8 m/ss (negligible)
// Aearth     = 3.5425742 x 10^22 N / 5.9720 * 10^24 kg  = 0.00593 m/ss
//
// Vearth_tan:  a = v*v/r, v = sqrt(a*r) = sqrt(0.00593 m/ss * 149.6 * 10^9m) = 29784 m/s
//                   Mass               Distance to Sun
//   Sun      = 1.9891 * 10^30 kg
//   Mercury
//   Venus    = 4.8670 * 10^24 kg
//   Earth    = 5.9720 * 10^24 kg        149.6 * 10^9 m
//   Mars     = 6.3900 * 10^23 kg
//   Jupiter  = 1.8980 * 10^27 kg
//   Saturn
//   Uranus
//   Neptune
//   Pluto
//   Asteroid

class Particle {
    constructor(
        x,
        y,
        z,
        vx,
        vy,
        vz,
        mass,
        fixed_pos = false
    ) {
        this.x = x;
        this.y = y;
        this.z = z;
        
        this.vx = vx;
        this.vy = vy;
        this.vz = vz;

        this.ax = 0.0;
        this.ay = 0.0;
        this.az = 0.0;

        this.mass = mass;

        this.fixed_pos = fixed_pos;
    }

    clone( ) {
        return( new Particle(this.x, this.y, this.z, this.vx, this.vy, this.vz, this.mass, this.fixed_pos ) );
    }

    reset_acceleration( ) {
        this.ax = 0.0;
        this.ay = 0.0;
        this.az = 0.0;
    }

    interact( other_particle, bidirectional = true ) {
        var r2 = (this.x - other_particle.x)**2 + (this.y - other_particle.y)**2 + (this.z - other_particle.z)**2;
        //console.log("r2 = " + r2);
        var F = G * this.mass * other_particle.mass / r2;
        var rm1 = 1.0/Math.sqrt(r2); 
        var a_this = F / this.mass;
        var a_other_particle = F / other_particle.mass;
        //console.log( "a_this = " + a_this );
        //console.log( "a_other_particle = " + a_other_particle );
        this.ax += (a_this * (other_particle.x - this.x) * rm1);
        this.ay += (a_this * (other_particle.y - this.y) * rm1);
        this.az += (a_this * (other_particle.z - this.z) * rm1);
        other_particle.ax += (a_other_particle * (this.x - other_particle.x) * rm1);
        other_particle.ay += (a_other_particle * (this.y - other_particle.y) * rm1);
        other_particle.az += (a_other_particle * (this.z - other_particle.z) * rm1);
    }
 
    update_sine( delta_t ) {
        this.x += 0.01 * delta_t;
        this.y = this.y_offset + this.amplitude * Math.sin(this.x * Math.PI);
        if( this.x >= 1.0 ) {
            this.x = -1.0 + this.x - 1.0;
        }
    }

    update( delta_t ) {

        if( !this.fixed_pos ) {
            this.vx += (this.ax * delta_t);
            this.vy += (this.ay * delta_t);
            this.vz += (this.az * delta_t);

            this.x += (this.vx * delta_t);
            this.y += (this.vy * delta_t);
            this.z += (this.vz * delta_t);
        }

        // this.x += this.vx * delta_t + 0.5 * this.ax * delta_t * delta_t;
        // this.y += this.vy * delta_t + 0.5 * this.ay * delta_t * delta_t;
        // this.z += this.vz * delta_t + 0.5 * this.az * delta_t * delta_t;
        //console.log("x = " + this.x + " y = " + this.y + " z = " + this.z);
        //console.log("scaled: x = " + this.x/AU + " y = " + this.y/AU + " z = " + this.z/AU);
    }

    static genererate_random_particle(sun_x, sun_y, sun_z, sun_mass, radius_min, radius_max, eccen_min, eccen_max, mass_min, mass_max) {
        var radius = (radius_max-radius_min) * Math.random() + radius_min;
        var angle  = (2*Math.PI) * Math.random();
        var eccen  = (eccen_max - eccen_min) * Math.random() + eccen_min;
        var mass   = (mass_max - mass_min) * Math.random() + mass_min;

        var circular_tangent_velocity = Math.sqrt( G * sun_mass / radius ) * eccen;
        // Point on circle is:
        var px = radius * Math.cos(angle);
        var py = radius * Math.sin(angle);
        // Tangent vector is:
        var diff_x = px - sun_x;
        var diff_y = py - sun_y;
        // TODO: Does not handle 3D yet.
        var line_dir_x = -1.0 * diff_y;
        var line_dir_y = diff_x;
        var vec_length = Math.sqrt((line_dir_x**2) + (line_dir_y**2));
        line_dir_x = line_dir_x / vec_length;
        line_dir_y = line_dir_y / vec_length;
        var vx = circular_tangent_velocity * line_dir_x;
        var vy = circular_tangent_velocity * line_dir_y;

        var particle = new Particle(px, py, 0.0, vx, vy, 0.0, mass);
        return( particle );
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
        // for( var p = 0; p < this.particles.length; ++p ) {
        //     this.vertex_buffer[index++] = this.particles[p].x/AU;
        //     this.vertex_buffer[index++] = this.particles[p].y/AU;
        //     this.vertex_buffer[index++] = this.particles[p].z/AU;
        // }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.gl_vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertex_buffer, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(attribute_vertex,3,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.POINTS,0,this.particles.length);
    }
    update( delta_t ) {
        for( var p = 0; p < this.particles.length; ++p ) {
            //this.particles[p].update(delta_t);
            // Reset for this round of acceleration.
            this.particles[p].reset_acceleration();
        }
        // Painful N^2 loop.
        for( var m = 0; m < this.particles.length-1; ++m ) {
            var particle_m = this.particles[m];
            for( var n = m+1; n < this.particles.length; ++n ) {
                particle_m.interact(this.particles[n]);
            }
        }
        //exit
        // Update positions
        for( var m = 0; m < this.particles.length; ++m ) {
            this.particles[m].update(g_delta_t);
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

    particle_system.update(g_delta_t);
    particle_system.draw(gl);

    window.requestAnimationFrame(render_scene);
}

function main() {
    setup_webgl();

    setup_shaders();

    var particle_count = 10;
    var sun_mass = 4000.0;

    var earth_circ_v = Math.sqrt( G * sun_mass / 0.5);
    //console.log(earth_circ_v);
    //exit ;

    particle_system = new ParticleSystem(gl, particle_count+1);
    particle_system.add_particle( new Particle( 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, sun_mass) ); // Sun
    for( var c = 0; c < particle_count; ++c ) {
         var p = Particle.genererate_random_particle(0.0, 0.0, 0.0, sun_mass, 0.1, 0.8, 0.4, 1.0, 0.01, 0.1); 
         particle_system.add_particle( p );
    }
    // //particle_system.add_particle( new Particle( 0.5, 0.0, 0.0, 0.0, earth_circ_v, 0.0, 0.1) ); // Earth
    // var p = Particle.genererate_random_particle(0.0, 0.0, 0.0, 400.0, 0.5, 0.5, 1.0, 1.0, 0.1, 0.1); 
    // particle_system.add_particle( p ); // Earth
    // var p = Particle.genererate_random_particle(0.0, 0.0, 0.0, 400.0, 0.6, 0.6, 1.0, 1.0, 1.0, 1.0); 
    // particle_system.add_particle( p ); // Earth
    // //particle_system.add_particle( new Particle( 150.25E9, 0.0, 0.0, 0.0, 29000.0, 0.0, 6.39E23) ); // Mars

    // var particle_count = 1000;

    // particle_system = new ParticleSystem(gl, particle_count);
    // for( var c = 0; c < particle_count; ++c ) {
    //     var rx = 2*Math.random() - 1.0;
    //     //particle_system.add_particle( new Particle( rx, 0.0, 0.0, -1.0 + 2*Math.random(), Math.random() ) );
    //     //particle_system.add_particle( new Particle( rx, 0.0, 0.0, 0.0, Math.random() ) );
    //     particle_system.add_particle( new Particle( rx, 0.0, 0.0, 0.0, -1.0 + 2*Math.random(), Math.random() ) );
    // }

    render_scene();
}
