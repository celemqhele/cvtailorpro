
export const isPreviewOrAdmin = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    return (
        window.self !== window.top || 
        window.location.hostname.includes('googleusercontent.com') ||
        window.location.hostname.includes('webcontainer') ||
        window.location.hostname.includes('stackblitz') ||
        window.location.hostname === 'localhost'
    );
};
