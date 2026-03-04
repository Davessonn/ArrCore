import React from 'react';
import Containers from '../components/portainer/Containers';

const Portainer = () => {
    return (
        <>
            <header>
                <div className="flex flex-col items-center justify-center h-screen">
                    <h1 className="text-3xl font-bold mb-4">Portainer containers</h1>
                </div>
            </header>
            <Containers/>
        </>
    );
} 
export default Portainer;