import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const LiquidMetal: React.FC<{ isActive: boolean; volume?: number }> = ({ isActive, volume = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const requestRef = useRef<number | null>(null);
  const volumeRef = useRef(0);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.z = 3.5;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.position = 'absolute';
      renderer.domElement.style.top = '0';
      renderer.domElement.style.left = '0';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const handleMouseMove = (e: MouseEvent | TouchEvent) => {
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        // Normalize to -1 to 1
        mouseRef.current.targetX = (x / window.innerWidth) * 2 - 1;
        mouseRef.current.targetY = -(y / window.innerHeight) * 2 + 1;
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchstart', handleMouseMove);
      window.addEventListener('touchmove', handleMouseMove);

      const updateSize = () => {
        if (!containerRef.current || !rendererRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        if (width === 0 || height === 0) return;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(width, height);
      };

      const resizeObserver = new ResizeObserver(() => updateSize());
      resizeObserver.observe(containerRef.current);
      updateSize();

      // Custom Shader for Smooth, 3D Liquid Chrome
      const vertexShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseStrength;
        uniform float uVolume;

        // Simplex 3D Noise
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

        float snoise(vec3 v){ 
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 =   v - i + dot(i, C.xxx) ;
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );
          vec3 x1 = x0 - i1 + 1.0 * C.xxx;
          vec3 x2 = x0 - i2 + 2.0 * C.xxx;
          vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
          i = mod(i, 289.0 ); 
          vec4 p = permute( permute( permute( 
                    i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                  + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
                  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
          float n_ = 1.0/7.0;
          vec3  ns = n_ * D.wyz - D.xzx;
          vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );
          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );
          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
        }

        float getDisplacement(vec3 p) {
          // Lower frequency, higher amplitude for a "fused/blobby" look
          float d = snoise(p * 0.5 + uTime * 0.2) * (0.6 + uVolume * 0.5);
          d += snoise(p * 1.2 - uTime * 0.3) * (0.25 + uVolume * 0.3);
          d += snoise(p * 2.5 + uTime * 0.4) * 0.1;
          
          // Add a "pulse" effect
          float pulse = sin(uTime * 0.4) * 0.5 + 0.5;
          d *= (0.9 + 0.3 * pulse);

          // Mouse distortion
          vec3 mousePos = vec3(uMouse * 2.0, 0.0);
          float dist = distance(p, mousePos);
          float mouseEffect = smoothstep(1.5, 0.0, dist);
          d += mouseEffect * 0.4 * uMouseStrength;
          
          return d;
        }

        void main() {
          vUv = uv;
          
          float displacement = getDisplacement(position);
          vec3 displacedPosition = position + normal * displacement;
          
          // Calculate new normals using finite difference with better precision
          float e = 0.005;
          vec3 dx = vec3(e, 0.0, 0.0);
          vec3 dy = vec3(0.0, e, 0.0);
          vec3 dz = vec3(0.0, 0.0, e);
          
          float d0 = getDisplacement(position);
          float d1 = getDisplacement(position + dx);
          float d2 = getDisplacement(position + dy);
          float d3 = getDisplacement(position + dz);
          
          vec3 grad = vec3(d1 - d0, d2 - d0, d3 - d0) / e;
          vNormal = normalize(normalMatrix * (normal - grad));
          
          vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          vec4 mvPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
          vViewPosition = -mvPosition.xyz;
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const fragmentShader = `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewPosition;
        varying vec3 vWorldPosition;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform float uMouseStrength;
        uniform float uVolume;

        // More complex environment approximation for "non-static" color
        vec3 getEnvColor(vec3 ray) {
          // Base sky/ground gradient
          float sky = smoothstep(-0.5, 1.0, ray.y);
          vec3 skyColor = mix(vec3(0.02, 0.0, 0.01), vec3(1.0, 0.4, 0.4), sky);
          // Austria/Red Theme Ground Colors
          vec3 groundColor = mix(vec3(0.02, 0.0, 0.0), vec3(0.1, 0.02, 0.02), 1.0 - sky);
          
          vec3 color = skyColor + groundColor;

          // Multiple dynamic studio lights/reflections
          for(int i = 0; i < 3; i++) {
            float fi = float(i);
            vec3 lPos = normalize(vec3(
              sin(uTime * (0.4 + fi * 0.1) + fi * 2.0),
              cos(uTime * (0.3 + fi * 0.15) + fi * 1.5),
              sin(uTime * (0.5 + fi * 0.05) + fi * 3.0)
            ));
            
            float spec = pow(max(0.0, dot(ray, lPos)), 24.0 + fi * 8.0);
            vec3 lCol = mix(vec3(1.0), vec3(1.0, 0.25, 0.3), 0.5 * sin(uTime + fi));
            color += lCol * spec * (1.5 - fi * 0.3);
          }

          // Add some red sparkle
          float horizon = 1.0 - abs(ray.y);
          color += vec3(0.8, 0.2, 0.2) * pow(horizon, 12.0) * 0.5;
          
          return color;
        }

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPosition);
          vec3 reflectDir = reflect(-viewDir, normal);
          
          // Fresnel for natural metallic look
          float fresnel = 0.02 + 0.98 * pow(1.0 - max(0.0, dot(normal, viewDir)), 4.0);
          
          vec3 env = getEnvColor(reflectDir);
          
          // Base chrome color
          vec3 baseColor = vec3(0.95, 0.96, 1.0);
          
          // Blend environment with base metallic color
          // Chrome is mostly reflection
          vec3 finalColor = mix(baseColor * 0.1, env, fresnel);
          finalColor += env * 0.6; // Strong global reflection for chrome
          
          // Add a subtle "iridescence" or color shift based on angle
          vec3 colorShift = vec3(
            sin(uTime * 0.2 + dot(normal, viewDir) * 2.0) * 0.02,
            cos(uTime * 0.15 + dot(normal, viewDir) * 1.5) * 0.02,
            sin(uTime * 0.25 + dot(normal, viewDir) * 3.0) * 0.02
          );
          finalColor += colorShift;

          // Mouse-based color shift
          float mouseDist = distance(vUv, uMouse * 0.5 + 0.5);
          float mouseHighlight = smoothstep(0.4, 0.0, mouseDist);
          finalColor = mix(finalColor, finalColor + vec3(0.3, 0.1, 0.1), mouseHighlight * uMouseStrength);

          // High-frequency highlights
          float spec = pow(max(0.0, dot(normal, normalize(vec3(1.0, 1.0, 1.0)))), 128.0);
          finalColor += vec3(1.0) * spec * 0.5;
          
          // Soft rim light for 3D depth
          float rim = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.5);
          finalColor += vec3(0.8, 0.9, 1.0) * rim * 0.4;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `;

      const geometry = new THREE.IcosahedronGeometry(1.4, 128);
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(0, 0) },
          uMouseStrength: { value: 0 },
          uVolume: { value: 0 }
        }
      });

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const animate = (time: number) => {
        const t = time * 0.001;
        material.uniforms.uTime.value = t;
        material.uniforms.uVolume.value = volumeRef.current;
        
        // Smooth mouse movement
        mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
        mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;
        material.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

        // Fade in mouse strength
        material.uniforms.uMouseStrength.value = THREE.MathUtils.lerp(
          material.uniforms.uMouseStrength.value,
          isActive ? 1.0 : 0.0,
          0.05
        );
        
        if (isActive) {
          // More fluid, organic "swimming" motion
          // Using multiple frequencies for less mechanical movement
          mesh.position.x = Math.sin(t * 0.8) * 0.12 + Math.cos(t * 1.5) * 0.05 + mouseRef.current.x * 0.1;
          mesh.position.y = Math.cos(t * 0.7) * 0.1 + Math.sin(t * 1.2) * 0.04 + mouseRef.current.y * 0.1;
          mesh.position.z = Math.sin(t * 0.5) * 0.08;
          
          // Very gentle, natural rotation
          mesh.rotation.x = t * 0.15 + Math.sin(t * 0.3) * 0.1;
          mesh.rotation.y = t * 0.2 + Math.cos(t * 0.4) * 0.1;
          
          // Natural "breathing" scale with more organic rhythm
          const s = 1.0 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.03;
          mesh.scale.set(s, s, s);
        } else {
          mesh.position.set(0, 0, 0);
          mesh.scale.setScalar(1.0);
        }
        
        renderer.render(scene, camera);
        requestRef.current = requestAnimationFrame(animate);
      };

      requestRef.current = requestAnimationFrame(animate);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchstart', handleMouseMove);
        window.removeEventListener('touchmove', handleMouseMove);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        if (rendererRef.current) {
          rendererRef.current.dispose();
          if (containerRef.current) {
            containerRef.current.removeChild(rendererRef.current.domElement);
          }
        }
      };
    }, [isActive]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex items-center justify-center pointer-events-none"
    />
  );
};
