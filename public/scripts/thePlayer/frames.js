export const frames = {
    moving: [],
    idle: null
};

export function loadImages() {
    const promises = [];

    for (let i = 0; i < 8; i++) {
        const img = new Image();
        img.src = `assets/character/stella/Stella_moving(R${i}).png`;
        promises.push(new Promise((resolve, reject) => {
            img.onload = () => { frames.moving[i] = img; resolve(); };
            img.onerror = () => reject(`Erro ao carregar frame R${i}`);
        }));
    }

    const idleImg = new Image();
    idleImg.src = 'assets/character/stella/Stella_stand.png';
    promises.push(new Promise((resolve, reject) => {
        idleImg.onload = () => { frames.idle = idleImg; resolve(); };
        idleImg.onerror = () => reject('Erro ao carregar frame idle');
    }));

    return Promise.all(promises);
}
