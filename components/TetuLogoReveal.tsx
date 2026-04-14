import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, Environment, Float, Text3D, GradientTexture } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { easing } from 'maath';

const LogoText = () => {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame((state, delta) => {
    if (group.current) {
      // Intro fade in and scale up smoothly
      const targetScale = 1;
      easing.damp3(group.current.scale, [targetScale, targetScale, targetScale], 0.8, delta);

      const targetZ = 0;
      easing.damp(group.current.position, 'z', targetZ, 0.8, delta);
    }
  });

  return (
    <group ref={group} scale={[0.1, 0.1, 0.1]} position={[0, 0, -10]}>
      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.5}>
        <Center>
          <Text3D
            font="/fonts/helvetiker_bold.typeface.json"
            size={2}
            height={0.4}
            curveSegments={32}
            bevelEnabled
            bevelThickness={0.1}
            bevelSize={0.05}
            bevelOffset={0}
            bevelSegments={10}
            letterSpacing={0.5}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            T E T U
            <meshPhysicalMaterial
              ref={materialRef}
              color={hovered ? "#ffffff" : "#cccccc"}
              metalness={0.9}
              roughness={0.05}
              transmission={0.4}
              ior={1.5}
              thickness={2}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={2.5}
            />
          </Text3D>
        </Center>
      </Float>
    </group>
  );
};

const PlanetaryArc = () => {
  const arcRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (arcRef.current) {
      arcRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
    if (lightRef.current) {
      // Sweeping light motion
      const time = state.clock.elapsedTime;
      const radius = 6.5;
      lightRef.current.position.x = Math.sin(time * 0.8) * radius;
      lightRef.current.position.y = Math.cos(time * 0.8) * (radius * 0.5); // Elliptical sweep
      lightRef.current.position.z = -1 + Math.sin(time * 2) * 2;
    }
  });

  return (
    <group position={[0, 0, -2]}>
      <mesh ref={arcRef} rotation={[Math.PI / 6, 0, 0]}>
        <torusGeometry args={[6, 0.05, 16, 100, Math.PI * 1.5]} />
        <meshBasicMaterial>
          <GradientTexture
            stops={[0, 0.5, 1]}
            colors={['#7e22ce', '#3b82f6', '#7e22ce']} // Purple to Blue
            size={1024}
          />
        </meshBasicMaterial>
      </mesh>

      {/* Sweeping Point Light */}
      <pointLight ref={lightRef} color="#8b5cf6" intensity={15} distance={20} decay={2} />

      {/* Ambient background light from arc */}
      <pointLight color="#3b82f6" position={[0, 0, -4]} intensity={5} distance={15} />
    </group>
  );
};

const TetuLogoReveal = () => {
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
        dpr={[1, 2]} // Support high-res displays
      >
        <color attach="background" args={['#030305']} />
        <fog attach="fog" args={['#030305', 8, 25]} />

        {/* Environment for nice reflections */}
        <Environment preset="city" />

        <ambientLight intensity={0.2} />

        <PlanetaryArc />
        <LogoText />

        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} />
          <Noise opacity={0.02} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>
      </Canvas>

      {/* Optional HTML overlay if needed */}
      <div className="absolute bottom-8 w-full text-center pointer-events-none opacity-30">
        <p className="text-white text-xs tracking-widest font-mono">T E C H N O L O G I E S</p>
      </div>
    </div>
  );
};

export default TetuLogoReveal;
