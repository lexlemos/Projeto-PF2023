// funções desenvolvidas por chrokh
// https://github.com/chrokh/fp-games/blob/master/001-snake/base.js
const merge     = o1 => o2 => Object.assign({}, o1, o2)
const objOf     = k => v => ({ [k]: v })
const spec      = o => x => Object.keys(o).map(k => objOf(k)(o[k](x))).reduce((acc, o) => Object.assign(acc, o))
const specEvent = o => e => x => Object.keys(o).map(k => objOf(k)(o[k](e)(x))).reduce((acc, o) => Object.assign(acc, o))

//objeto mutavel
const sprite = new Image()
sprite.src = "./sprites.png"
//

// Desenha um objeto do jogo, utilizando de um contexto do canvas uma imagem de spritesheet e o próprio objeto
// São utilizadas as coordenadas do objeto, e do recorte do sprite que contem a imagem dele, além das dimensões do objeto e do recorte do sprite
const draw_game_object = (context) => (image) => (obj) => {
    context.drawImage(image, obj.spriteX, obj.spriteY, obj.swidth, obj.sheight, obj.x, obj.y, obj.width, obj.height)
}

//Limita uma posição a se manter dentro de um intervalo, para que quando passe das bordas se mantenha nas bordas
const cap = (up_cap, down_cap) => (pos, height) => {
    if (pos + height > up_cap) {
        return up_cap - height
    }
    if (pos < down_cap) {
        return down_cap
    }
    return pos
}

// gera um novo objeto de jogador(player) atualizando sua posição com base na cena do jogo, no tempo passado, e na tecla pressionada, altera tambem a velocidade(enquanto cai) e o efeito de gravidade quando o passaro pula
const next_player = (execution) => (state) => {
    if(state.scene === "play") {
      const new_y =   cap(state.canvas.height - state.floor.height, 0)(state.player.y +state.player.v*execution.dt, 24)
      const new_v = (execution.keyboard.key === "w") ? -0.5 : state.player.v + execution.dt*0.002
      return merge(state.player)({y: new_y, v: new_v})
    }
    return {...state.player}
}

//Muda a cena do jogo, sai da tela de início se apertar "w"
const next_scene = (execution) => (state) => {
    if(state.scene === "start") {
        if(execution.keyboard.key === "w") {
            return "play"
        }
        return "start"
    }
    return "play"
}

//gera um novo estado do jogo
const next_state = specEvent({
    canvas: (execution) => (state) => state.canvas,
    context: (execution) => (state) => state.context,
    spritesheet: (execution) => (state) => state.spritesheet,
    floor: (execution) => (state) => state.floor,
    background: (execution) => (state) => state.background,
    initial_screen: (execution) => (state) => state.initial_screen,
    player: next_player,
    scene: next_scene
})

//desenha o jogo com base em seus objetos e sua cena
const draw_game = (state) => {
    draw_game_object(state.context)(state.spritesheet)(state.background)
    draw_game_object(state.context)(state.spritesheet)(state.floor)
    if(state.scene === "play"){
        draw_game_object(state.context)(state.spritesheet)(state.player)
    }
    else {
        draw_game_object(state.context)(state.spritesheet)(state.initial_screen)
    }
}

//estado inicial do jogo
const game = Object.freeze({
    canvas : Object.freeze(document.getElementById('canvas')),
    context : Object.freeze(canvas.getContext('2d')),
    spritesheet: Object.freeze(sprite),
    scene: "start",
    floor: {
        spriteX: 0,
        spriteY: 610,
        swidth: 224,
        sheight: 112,
        width: canvas.width,
        height: 112,
        x: 0,
        y: canvas.height - 112,
    },
    player : {
        spriteX: 0,
        spriteY: 0,
        swidth: 33,
        sheight: 24,
        width: 33,
        height: 24,
        x: canvas.width/2 - 16.5,
        y: 50,
        v: 0.25
    },
    background : {
        spriteX: 390,
        spriteY: 0,
        swidth: 275,
        sheight: 204,
        width: canvas.width,
        height: canvas.height + 50,
        x: 0,
        y: -50 
    },
    initial_screen:  {
        spriteX: 134,
        spriteY: 0,
        swidth: 174,
        sheight: 152,
        width: 174,
        height: 152,
        x: (canvas.width / 2) - 174 / 2,
        y: 50
    }
})

// trecho não funcional
//variável que armazena quando a tecla "w" é apertada e a variação de tempo entre um frame e outro
let global_event = {dt: 0, keyboard: {key: ""}}

//atualiza os frames e o estado do jogo
const loop = (state) => (t1) => (t2) => {
    global_event.dt = t2 - t1
    const new_state = next_state(global_event)(state)
    draw_game(state)
    window.requestAnimationFrame(loop(new_state)(t2))
}

//atualiza a variável global quando a tecla "w" é apertada e solta
window.addEventListener("keypress", (e) => {
    if (e.key === "w" && global_event.keyboard.key !== "w") {
        global_event.keyboard = e
    }
})
window.addEventListener("keyup", (e) => {
    if (e.key === "w") {
        global_event.keyboard = {key: ""}
    }
})

//roda o jogo
loop(game)(0)(0)



