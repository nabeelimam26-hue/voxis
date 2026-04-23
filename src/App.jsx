import React, { useRef, useEffect } from 'react';

const App = () => {
    const canvasRef = useRef(null);
    const videoRef = useRef(null);

    const startWebcam = async () => {
        if (videoRef.current) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'user' } }
                });
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            } catch (error) {
                handleWebcamError(error);
            }
        }
    };

    const handleWebcamError = (error) => {
        if (error.name === 'NotReadableError') {
            console.error('The camera is already in use.');
        } else if (error.name === 'ConstraintError') {
            console.error('The requested constraints could not be satisfied.');
        } else if (error.name === 'SecurityError') {
            console.error('Security error. Please check your permissions.');
        } else {
            console.error('An unknown error occurred:', error);
        }
    };

    useEffect(() => {
        startWebcam();
    }, []);

    return (
        <div>
            <canvas ref={canvasRef} />
            <video ref={videoRef} style={{display: 'none'}} crossOrigin="anonymous" />
        </div>
    );
};

export default App;