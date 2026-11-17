//Sofia Campos A01277013
//Cat Face
//Copia con modificaciones del código de smiley.ts
'use strict';

import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond} from '../libs/shapes.js';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';
import { type Color } from '../libs/color.js';

// Import the shaders from external files
import vsGLSL from '../04_UI/vs_matrices_vcolor.glsl?raw';
import fsGLSL from '../04_UI/fs_vertex_color.glsl?raw';


//Haré un gato
function catFace(): twgl.Arrays {
    const positions = [
        // Cabeza hexagonal con seis triángulo
        0, 0,   -60, -70,    60, -70,
        0, 0,    60, -70,   100,   0,
        0, 0,   100,   0,    60,  70,
        0, 0,    60,  70,   -60,  70,
        0, 0,   -60,  70,  -100,   0,
        0, 0,  -100,   0,   -60, -70,

        // Oreja izquierda.
        -95, -110,   -60, -70,   -100, 0,

        // Oreja derecha.
         95, -110,   100,   0,     60, -70,
        // Ojo izquierdo.
        -55, -30,   -25, -30,   -40, -10,

        // Ojo derecho.
         25, -30,    55, -30,    40, -10,

        // Nariz.
        -12,  10,    12,  10,     0,  25,
    ];

    // Un color RGBA para cada vértice.
    const colors: number[] = [];

    // Cabeza y orejas: 8 triángulos × 3 vértices = 24 vértices.
for (let i = 0; i < 24; i++) {
    colors.push(0.95, 0.65, 0.30, 1);
}

// Ojos: 2 triángulos × 3 vértices = 6 vértices.
for (let i = 0; i < 6; i++) {
    colors.push(0.12, 0.08, 0.06, 1);
}

// Nariz: 1 triángulo × 3 vértices = 3 vértices.
for (let i = 0; i < 3; i++) {
    colors.push(0.95, 0.40, 0.50, 1);
}

    return {
        a_position: {
            numComponents: 2,
            data: positions,
        },
        a_color: {
            numComponents: 4,
            data: colors,
        },
    };
}
/*
 * Subclass of Scene with the particular objects and settings for this example.
 * Specifies the objects that will be used, and the UI operations available.
 */
class RotationScene extends Scene {
    private settings = {
        order: 'scale -> translation -> rotation',
    };

    constructor(gl: WebGL2RenderingContext) {
        super(gl, vsGLSL, fsGLSL);

        // Create the objects for this scene
        const model = this.addObject('model', catFace(), //en luagr de smiley ahora catFace
            [ 1,1,1,1 ]);
        model.transforms.t.x = gl.canvas.width / 2;
        model.transforms.t.y = gl.canvas.height / 2;

        const pivot = this.addObject('pivot', diamond(30),
            [ 0.6, 0.6, 0.6, 1]);
        pivot.transforms.t.x = gl.canvas.width / 2;
        pivot.transforms.t.y = gl.canvas.height / 2;
    }

    // Method to draw the scene.
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // Vector to the position of the model
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);

        // Vector to translate the pivot to the center of the world
        const v2_pivot_to_center: Vec2 = V2.create(-pivot.transforms.t.x,
                                                   -pivot.transforms.t.y);
        // Vector to translate the pivot back to its original position
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x,
                                                   pivot.transforms.t.y);

        // Transform matrices for the model
        // TODO: Create the matrices necessary
        const scaleMatrixModel: Mat3 = M3.scale(v2_scale);
        const translateMatrixModel: Mat3 = M3.translation(v2_trans);
        const rotateMatrixModel: Mat3 = M3.rotation(model.transforms.rr.z);
        const pivotToCenter: Mat3 = M3.translation(v2_pivot_to_center);
        const centerToPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // para la rotación simepre con pivote
        const rotationAroundPivot: Mat3 = M3.multiply(
            centerToPivot,
            M3.multiply(rotateMatrixModel, pivotToCenter)
        );

        // Asociar  nombre con  matriz.
        const matrices: Record<string, Mat3> = {
            scale: scaleMatrixModel,
            rotation: rotationAroundPivot,
            translation: translateMatrixModel,
        };

        // Orden elegido en el menú.
        const order = this.settings.order.split(' -> ');

        // Operaciones en ese orden.
        let modelTransforms: Mat3 = M3.identity();

        for (const operation of order) {
            modelTransforms = M3.multiply(
                matrices[operation],
                modelTransforms
            );
        }

        gl.useProgram(programInfo.program);

        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: modelTransforms,
            u_color: model.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        // Transform matrices for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        // Composite transform matrix for the pivot (only translation)
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
            u_color: pivot.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    setupUI(): void {
        const { gl } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        const gui = new GUI();
        gui.add(this.settings, 'order', [ //menu desplegable
        'scale -> rotation -> translation',
        'scale -> translation -> rotation',
        'translation -> scale -> rotation',
        'rotation -> translation -> scale',
        'rotation -> scale -> translation',
    ]).name('Orden');

        const modelFolder = gui.addFolder('Model');

        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                model.transforms.t.y = value;
            });

        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2)
            .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5)
            .onChange((value: number) => {
                model.transforms.s.y = value;
            });

        const colorFolder = modelFolder.addFolder('Color');
        colorFolder.addColor(model, 'color')
            .onChange((value: Color) => {
                model.color = value;
            });

        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

/*
 * Main function to initialize the WebGL context, create the scene, and set up the UI.
 */
function main(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
        throw new Error('No canvas element found in the document');
    }

    const gl = canvas.getContext('webgl2');
    if (!gl) {
        throw new Error('WebGL2 is not supported by this browser');
    }

    const scene = new RotationScene(gl);
    scene.setupUI();
    scene.draw(0);
}

main()