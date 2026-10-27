const $ = id => document.getElementById(id);

const BC = [
    "bake a loaf",
    "wait(empty)   // need a free spot",
    "wait(mutex)   // take the lock",
    "put loaf on shelf",
    "signal(mutex) // release the lock",
    "signal(full)  // one more loaf"
];

const CC = [
    "wait(full)    // need a loaf",
    "wait(mutex)   // take the lock",
    "take loaf from shelf",
    "signal(mutex) // release the lock",
    "signal(empty) // one more free spot",
    "eat the loaf"
];

let S;
let timer = null;
let on = false;

function init() {
    const N = +$("N").value;

    S = {
        N,
        shelf: Array(N).fill(0),
        inI: 0,
        outI: 0,
        empty: N,
        full: 0,
        mutex: 1,
        made: 0,
        eaten: 0,

        b: { pc: 0, cd: 1, blk: null, msg: "Getting ready to bake." },
        c: { pc: 0, cd: 1, blk: null, msg: "Walking into the shop." },

        story: "Press Start (or Step) to begin. The shelf is empty."
    };

    render();
}

function sem(name) {
    return S[name];
}

function wait(a, who, name, why) {
    if (S[name] > 0) {
        S[name]--;
        a.pc++;
        return true;
    }

    a.blk = name;
    a.msg = "Waiting: " + why;
    S.story = who + " must wait because " + why + ".";

    return false;
}

function signal(a, who, name, other) {
    const o = other;

    if (o.blk === name) {
        o.blk = null;
        o.pc++;
        o.cd = (name === "mutex") ? 1 : 0;

        S.story += " " +
            (who === "Baker" ? "Customer" : "Baker") +
            " wakes up!";
    } else {
        S[name]++;
    }
}

function stepBaker() {
    const a = S.b;

    if (a.blk) return;

    if (a.cd > 0) {
        a.cd--;
        return;
    }

    switch (a.pc) {
        case 0:
            S.made++;
            a.msg = "Baked loaf #" + S.made;
            S.story = "Baker baked loaf #" + S.made + ".";
            a.pc = 1;
            break;

        case 1:
            if (wait(a, "Baker", "empty", "the shelf is full")) {
                S.story = "Baker found a free spot (empty went down by 1).";
            }
            break;

        case 2:
            if (wait(a, "Baker", "mutex", "the customer is using the shelf")) {
                a.cd = 1;
                S.story = "Baker took the lock and is reaching for the shelf.";
            }
            break;

        case 3:
            S.shelf[S.inI] = S.made;
            S.inI = (S.inI + 1) % S.N;
            a.msg = "Put loaf on shelf";
            S.story = "Baker put the loaf on the shelf.";
            a.pc = 4;
            break;

        case 4:
            S.story = "Baker released the lock.";
            signal(a, "Baker", "mutex", S.c);
            a.pc = 5;
            break;

        case 5:
            S.story = "Baker announced one more loaf (full went up by 1).";
            signal(a, "Baker", "full", S.c);
            a.msg = "Back to baking";
            a.pc = 0;
            a.cd = 7 - (+$("B").value);
            break;
    }
}

function stepCust() {
    const a = S.c;

    if (a.blk) return;

    if (a.cd > 0) {
        a.cd--;
        return;
    }

    switch (a.pc) {
        case 0:
            if (wait(a, "Customer", "full", "the shelf is empty")) {
                S.story = "Customer sees a loaf (full went down by 1).";
            }
            break;

        case 1:
            if (wait(a, "Customer", "mutex", "the baker is using the shelf")) {
                a.cd = 1;
                S.story = "Customer took the lock and is reaching for the shelf.";
            }
            break;

        case 2:
            S.shelf[S.outI] = 0;
            S.outI = (S.outI + 1) % S.N;
            a.msg = "Took a loaf";
            S.story = "Customer took a loaf from the shelf.";
            a.pc = 3;
            break;

        case 3:
            S.story = "Customer released the lock.";
            signal(a, "Customer", "mutex", S.b);
            a.pc = 4;
            break;

        case 4:
            S.story = "Customer told the baker there is one more free spot (empty went up by 1).";
            signal(a, "Customer", "empty", S.b);
            a.pc = 5;
            break;

        case 5:
            S.eaten++;
            a.msg = "Ate loaf. Yum!";
            S.story = "Customer ate a loaf. Total eaten: " + S.eaten + ".";
            a.pc = 0;
            a.cd = 7 - (+$("C").value);
            break;
    }
}

function tick() {
    stepBaker();
    stepCust();
    render();
}

function code(L, a) {
    return L.map((t, i) =>
        '<div class="' +
        (a.pc === i ? (a.blk ? "bl" : "on") : "") +
        '">' + (i + 1) + ". " + t + "</div>"
    ).join("");
}

function render() {
    $("vE").textContent = S.empty;
    $("vF").textContent = S.full;
    $("vM").textContent = S.mutex;

    $("shelf").innerHTML = S.shelf.map(x =>
        '<div class="slot' + (x ? " f" : "") + '">' +
        (x ? "🍞" : "") +
        "</div>"
    ).join("");

    $("cap").textContent =
        "Made: " + S.made +
        " | Eaten: " + S.eaten +
        " | On shelf: " + S.full;

    $("story").textContent = S.story;

    $("fb").textContent = S.b.blk ? "😴" : "👨‍🍳";
    $("fc").textContent = S.c.blk ? "😴" : "🧑";

    $("sb").textContent = S.b.msg;
    $("sc").textContent = S.c.msg;

    $("wb").classList.toggle("wait", !!S.b.blk);
    $("wc").classList.toggle("wait", !!S.c.blk);

    $("cb").innerHTML = code(BC, S.b);
    $("cc").innerHTML = code(CC, S.c);
}

function setTimer() {
    clearInterval(timer);
    timer = null;

    if (on) {
        timer = setInterval(tick, 1400 / +$("S").value);
    }
}

function toggle(v) {
    on = v;
    $("run").textContent = on ? "Pause" : "Start";
    setTimer();
}

$("run").onclick = () => toggle(!on);

$("step").onclick = () => {
    toggle(false);
    tick();
};

$("reset").onclick = () => {
    toggle(false);
    init();
};

[["N", "oN"], ["B", "oB"], ["C", "oC"], ["S", "oS"]]
    .forEach(([i, o]) => {
        $(i).oninput = () => {
            $(o).textContent = $(i).value;

            if (i === "S") {
                setTimer();
            }

            if (i === "N") {
                toggle(false);
                init();
            }
        };
    });

init();
