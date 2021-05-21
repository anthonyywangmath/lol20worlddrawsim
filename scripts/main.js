const Region = {
    LPL: "LPL",
    LEC: "LEC",
    LCK: "LCK",
    LCS: "LCS",
    PCS: "PCS"
};

const Team = {
    TES: { region : Region.LPL, name : "TES", pool : 0 , numInPool : 0},
    JDG: { region : Region.LPL, name : "JDG", pool : 1 , numInPool : 0},
    SN:  { region : Region.LPL, name : "SN" , pool : 1 , numInPool : 1},
    G2:  { region : Region.LEC, name : "G2" , pool : 0 , numInPool : 1},
    FNC: { region : Region.LEC, name : "FNC", pool : 1 , numInPool : 2},
    RGE: { region : Region.LEC, name : "RGE", pool : 2 , numInPool : 0},
    DWG: { region : Region.LCK, name : "DWG", pool : 0 , numInPool : 2},
    DRX: { region : Region.LCK, name : "DRX", pool : 1 , numInPool : 3},
    GEN: { region : Region.LCK, name : "GEN", pool : 2 , numInPool : 1},
    TSM: { region : Region.LCS, name : "TSM", pool : 0 , numInPool : 3},
    FLY: { region : Region.LCS, name : "FLY", pool : 2 , numInPool : 2},
    MCX: { region : Region.PCS, name : "MCX", pool : 2 , numInPool : 3}
};

const EMPTY = {};

const LIST_OF_TEAMS = [[Team.TES, Team.G2, Team.DWG, Team.TSM], 
                       [Team.JDG, Team.SN, Team.FNC, Team.DRX], 
                       [Team.RGE, Team.GEN, Team.FLY, Team.MCX]];

function numberPoolToTeam(num, poolNum){
    return LIST_OF_TEAMS[poolNum][num];
};

const Group = {
    A : 0,
    B : 1,
    C : 2,
    D : 3,
};

/* A GroupBoard is an object representing the current state of the drawn teams:
 * initially the board is empty, then it is slowly filled in.
 *
 * groupA, ..., groupD are all lists of three items.
 * Each item is either a Team or EMPTY, with the index in the list equal to the pool of the team.
 */
function GroupBoard(groupA, groupB, groupC, groupD){
    this.board = [groupA, groupB, groupC, groupD];
}

function emptyGroupBoard(){
    return new GroupBoard([EMPTY, EMPTY, EMPTY], 
                          [EMPTY, EMPTY, EMPTY], 
                          [EMPTY, EMPTY, EMPTY], 
                          [EMPTY, EMPTY, EMPTY]);
};

GroupBoard.prototype.clone = function() {
    return new GroupBoard(this.board[0].filter(s=>true), 
                          this.board[1].filter(s=>true), 
                          this.board[2].filter(s=>true), 
                          this.board[3].filter(s=>true));
}

GroupBoard.prototype.replace = function(team, group, pool) {
    this.board[group][pool] = team;
};

// replacement without affecting the original board.
function functionalReplaceInBoard(board, team, group, pool) {
    let newBoard = board.clone();
    newBoard.replace(team,group,pool);
    return newBoard;
}

/* isViableGroup checks if a putative list of teams is a viable group.
 * groupMembers is a three item list of teams (or EMPTY), with the index in the list
 * equal to the pool of the team.
 */
function isViableGroup(groupMembers) {
    if (groupMembers.length !== 3) { 
        return false;
    }
    for (let i = 0; i < groupMembers.length; i++) {
        for (let j = i+1; j<groupMembers.length; j++) {
            if (groupMembers[i].region === groupMembers[j].region 
                    || groupMembers[i].region === null 
                    || groupMembers[j].region === null) {
                return false;
            }
        }
    }
    if (groupMembers[0] === Team.TSM 
            && groupMembers[1] === Team.DRX 
            && groupMembers[2] === Team.MCX) {
        return false;
    }
    return true;
}

// Checks if this GroupBoard only contains viable groups.
GroupBoard.prototype.isViableFinal = function() {
    for (let i=0; i< this.board.length; i++) {
        if (!isViableGroup(this.board[i])) {
            return false;
        }
    }
    return true;
}

/* We build a tree of all possible partial states during the drawing of teams
 * with each node representing the current GroupBoard,
 * and the children of any given node being the nodes 
 * gotten by adding another team to the current board.
 * The leaves of the tree are then the final filled out boards.
 *
 * AdvancerNode is a node in this tree.
 * - board is a GroupBoard representing the current board
 * - children is a list of AdvancerNodes which are gotten from the current GroupBoard
 *      by adding a team from nextTeams
 * - nextTeams is a list of the next teams that can be added.
 *      This list has the same length as children, with children[i] being the node
 *      gotten by adding nextTeams[i] to the current GroupBoard.
 */
function AdvancerNode(board, children, nextTeams) {
    this.board=board;
    this.children=children;
    this.nextTeams=nextTeams;
}

/* If this is the AdvancerNode with board equal to the current board,
 * getChild(team) is the child AdvancerNode gotten by adding team to the current board.
 * 
 * team is assumed to be an item in nextTeams of the current node.
 */
AdvancerNode.prototype.getChild = function(team) {
    return this.children[nextTeams.indexOf(team)];
}

/* getSpray counts the number of times each team occurs in each position
 * in the leaves of this AdvancerNode.
 * This is used to compute the probability for a team to be placed in each position
 * given the current state of the board.
 *
 * getSpray() is an array with getSpray()[i][j][k] equal to the number of times
 * the team in pool j and numInPool k (i.e. the team numberPoolToTeam(k,j)) is placed in
 * group i in the leaves of the current AdvancerNode.
 */
AdvancerNode.prototype.getSpray = function() {
    if (this.children.length === 0) {
        let spray = [[[0,0,0,0], [0,0,0,0], [0,0,0,0]], 
                     [[0,0,0,0], [0,0,0,0], [0,0,0,0]], 
                     [[0,0,0,0], [0,0,0,0], [0,0,0,0]], 
                     [[0,0,0,0], [0,0,0,0], [0,0,0,0]]];
        for (let i=0; i<4; i++) {
            for (let j=0; j<3; j++) {
                spray[i][j][this.board.board[i][j].numInPool] = 1;
            }
        }
        return spray;
    } else {
        let spray = this.children[0].getSpray();
        for (let i=1; i<this.children.length; i++) {
            let newSpray = this.children[i].getSpray();
            for (let j=0; j<4; j++) {
                for (let k=0; k<3; k++) {
                    for (let l=0; l<4; l++) {
                        spray[j][k][l] = spray[j][k][l]+ newSpray[j][k][l];
                    }
                }
            }
        }
        return spray;
    }
}

/* nextRemainingTeams takes as arguments
 * - current: a two-dimensional array containing the teams which have not been put in the
 *   board yet.
 *   current[i] is a list of teams in pool i which have not been put on the board yet.
 * - team: a team in current which is to be the next team to be put in the board
 *
 * It returns the remaining teams after removing team from current.
 */
function nextRemainingTeams(current, team) {
    let nextOnes = [];
    let poolIndex=team.pool;
    for (let i = 0; i< current.length; i++){
        if (i === poolIndex) {
            nextOnes.push(current[i].filter(s => s !== team));
        } else {
            nextOnes.push(current[i].filter(s=>true));
        }
    }
    return nextOnes;
}


/* createTree returns null if there is no way of filling in the remaining teams 
 * on the boardAttempt
 * If there is such a method, createTree returns the underlying AdvancerNode 
 * with the desired decision tree.
 *
 * The algorithm is pretty general in that it only depends on GroupBoard's 
 * isViableFinal method.
 *
 * The arguments are
 * -boardAttempt: a GroupBoard
 * -remainingTeams: a 2 dimensional array of teams which have not been placed in 
 *      boardAttempt yet
 * -notTakenGroups: the groups which have not been placed during the placement of teams
 *      from the current pool
 * -size: the number of teams which have been placed in boardAttempt
 *
 * All the other arguments can be deduced from boardAttempt.
 * They are passed as arguments so that it is not necessary to compute them from 
 * boardAttempt.
 */
function createTree(boardAttempt, remainingTeams, notTakenGroups, size) {
    let poolIndex = Math.floor(size/4);
    if (poolIndex === 3) {
        if (boardAttempt.isViableFinal()) {
            return new AdvancerNode(boardAttempt, [], [], size);
        } else {
            return null;
        }
    }
    /* addNext(team) attempts to add team to the Board attempt, 
     * returing the AdvancerNode
     * with the desired decision tree if it is possible, and null otherwise */
    function addNext(team) {
        for (let i=0; i < notTakenGroups.length; i++) {
            let currentGroup = notTakenGroups[i];
            let nextTeams = nextRemainingTeams(remainingTeams,team);
            let nextNotTakenGroups = notTakenGroups.filter(s=>s!==currentGroup);
            if (nextNotTakenGroups.length === 0) {
                nextNotTakenGroups = [Group.A, Group.B, Group.C, Group.D];
            }
            let treeNode = createTree(functionalReplaceInBoard(boardAttempt,
                                                               team,
                                                               currentGroup,
                                                               poolIndex),
                                      nextTeams,
                                      nextNotTakenGroups,
                                      size+1);
            if (treeNode !== null) {
                return treeNode;
            }
        }
        return null;
    }
    let possibleNextTeams = remainingTeams[poolIndex];
    let firstChild = addNext(possibleNextTeams[0]); 
    if (firstChild === null) { 
        return null; // We only need to check if it is possible to add 
                     // one of the remaining teams to know if 
                     // the boardAttempt is valid
    } else {
        let theChildren = [firstChild];
        for (let i=1; i< possibleNextTeams.length; i++) {
            let nextChild = addNext(possibleNextTeams[i]);
            theChildren.push(nextChild);
        }
        return new AdvancerNode(boardAttempt,theChildren,possibleNextTeams);
    }
}

/* An Advancer advances down the tree of all possibilities.
 *
 * node: the current AdvancerNode
 * picks: a list of the teams that have been picked in order
 */
function Advancer(node, picks){
    this.node = node;
    this.picks = picks;
}

function newAdvancer() {
    let remainingTeams = [[Team.TES, Team.G2, Team.DWG, Team.TSM], 
                          [Team.JDG, Team.SN, Team.FNC, Team.DRX], 
                          [Team.RGE, Team.GEN, Team.FLY, Team.MCX]];
    let remainingGroups = [Group.A,Group.B,Group.C,Group.D];
    return new Advancer(createTree(emptyGroupBoard(),
                                   remainingTeams,
                                   remainingGroups,0),
                        [])
}

const STARTING_ADVANCER = newAdvancer();

Advancer.prototype.possibleNextTeams = function() {
    return this.node.nextTeams;
}

Advancer.prototype.getBoard = function() {
    return this.node.board;
}

Advancer.prototype.getSpray = function() {
    return this.node.getSpray();
}

Advancer.prototype.canAdvance = function(team) {
    return this.node.nextTeams.indexOf(team) !== -1;
}

Advancer.prototype.advance = function(team) {
    let i = this.node.nextTeams.indexOf(team);
    let nextPicks = this.picks.filter(s => true);
    nextPicks.push(team);
    return new Advancer(this.node.children[i], nextPicks);
}

Advancer.prototype.canDrawNext = function() {
    let nextTeams = this.possibleNextTeams();
    return nextTeams.length !== 0;
}

Advancer.prototype.drawNext = function() {
    let nextTeams = this.possibleNextTeams();
    if (nextTeams.length === 0) {
        return this;
    }
    let i = random(nextTeams.length);
    return this.advance(nextTeams[i]);
}

function random(n) {
    return Math.floor(Math.random()*n);
}

Advancer.prototype.nextPoolIndex = function() {
    return Math.floor(this.picks.length/4);
}

/*
 * When working with the selector, 
 * it is convenient to have the "nextPoolIndex" be 2 (instead of 3)
 * if there are no more teams to be selected.
 * This is since there is no third selector, so we just want to keep
 * the 2nd selector open if there are no more teams to be selected.
 */
Advancer.prototype.selectorNextPoolIndex = function() {
    let npi = this.nextPoolIndex();
    if (npi === 3) {
        return 2;
    }
    return npi;
}

/*
 * The selector has three pools, where you can click on a team to choose them to be the next draw.
 * SelectorState keeps track of the pools which are expanded.
 *
 * poolOpened is a list of 3 booleans, with poolOpened[i] being open if
 * pool i is open in the selector.
 */
function SelectorState(poolOpened) {
    this.poolOpened = poolOpened;
}

SelectorState.prototype.toggle = function(poolIndex1, poolIndex2) {
    let a = this.poolOpened[poolIndex1];
    this.poolOpened[poolIndex1] = this.poolOpened[poolIndex2];
    this.poolOpened[poolIndex2] = a;
}

const pool0SelectorPics = document.querySelectorAll(".pool-1-selector-pic");
const pool1SelectorPics = document.querySelectorAll(".pool-2-selector-pic");
const pool2SelectorPics = document.querySelectorAll(".pool-3-selector-pic");
const selectorPics = [pool0SelectorPics, pool1SelectorPics, pool2SelectorPics];

const pool0TopNums = document.querySelectorAll(".pool-1-top-number");
const pool1TopNums = document.querySelectorAll(".pool-2-top-number");
const pool2TopNums = document.querySelectorAll(".pool-3-top-number");
const topNums = [pool0TopNums, pool1TopNums, pool2TopNums];

const pools = document.querySelectorAll(".pool");

const LIST_OF_TOP_NUM_PICS = ["images/1.svg", "images/2.svg", "images/3.svg", 
                              "images/4.svg", "images/5.svg", "images/6.svg", 
                              "images/7.svg", "images/8.svg", "images/9.svg", 
                              "images/10.svg", "images/11.svg", 
                              "images/12.svg"];

/* updateSelectorExpansion takes a SelectorState
 * and updates the webpage so that the expansion of the selectors agrees with the 
 * given SelectorState.
 */
function updateSelectorExpansion(selectState) {
    for (let i=0; i<selectState.poolOpened.length; i++) {
        if (selectState.poolOpened[i] === true) {
            pools[i].style.display = "flex";
        } else {
            pools[i].style.display = "none";
        }
    }
}

/* updatePoolHeaderColors takes an pool number orangeIndex
 * and updates the pool headers in the selector so that pool orangeIndex
 * is orange and the other pools are blue.
 */
function updatePoolHeaderColors(orangeIndex) {
    for (let i=0; i< poolHeaders.length; i++) {
        if (i===orangeIndex) {
            poolHeaders[i].style.backgroundColor = "#E67E22";
        } else {
            poolHeaders[i].style.backgroundColor = "#2874A6";
        }
    }
}

/* updateSelectorPicOpacity takes an Advancer,
 * and updates the pictures of the teams in the selector
 * so that all the teams which have been picked in the advancer are transparent,
 * and all the teams which have not been picked are opaque.
 */
function updateSelectorPicOpacity(advancer) {
    let pi = advancer.nextPoolIndex();
    for (let i=0; i<3; i++) {
        for (let j=0; j<4; j++) {
            if (i !== pi || advancer.picks.indexOf(LIST_OF_TEAMS[i][j]) !== -1){
                selectorPics[i][j].style.opacity = "0.15";
            } else {
                selectorPics[i][j].style.opacity = "1";
            }
        }
    }
}

/* updateSelectorTopNums takes an Advancer,
 * and updates the numbers placed on top of the teams in the selector
 * so that all teams which have been selected have a number placed on top of them.
 * The number is equal to the order in which the team was picked.
 */
function updateSelectorTopNums(advancer) {
    for (let i=0; i<3; i++) {
        for (let j=0; j<4; j++) {
            topNums[i][j].style.visibility = "hidden";
        }
    }
    let pickedTeams = advancer.picks;
    for (let k=0; k<pickedTeams.length; k++) {
        let currentTeam = pickedTeams[k];
        topNums[currentTeam.pool][currentTeam.numInPool].src 
            = LIST_OF_TOP_NUM_PICS[k];
        topNums[currentTeam.pool][currentTeam.numInPool].style.visibility 
            = "visible";
    }
}

function updateSelector(selectState, advancer, orangeIndex) {
    updateSelectorExpansion(selectState);
    updatePoolHeaderColors(orangeIndex);
    updateSelectorPicOpacity(advancer);
    updateSelectorTopNums(advancer);
}

const poolHeaders = document.querySelectorAll(".pool-header");

for (let i = 0; i< poolHeaders.length; i++) {
    poolHeaders[i].addEventListener("click", function() {
        pageState.selectState.poolOpened[i] 
            = ! pageState.selectState.poolOpened[i];
        updateSelectorExpansion(pageState.selectState);
    });
}

// the display table is the part of the webpage which displays the currently selected teams
// and the probabilities for the unselected teams.
const tableRows = document.querySelectorAll(".display-table-pool");
const tablePool0Pics = tableRows[0].querySelectorAll(".display-table-cell img");
const tablePool1Pics = tableRows[1].querySelectorAll(".display-table-cell img");
const tablePool2Pics = tableRows[2].querySelectorAll(".display-table-cell img");
const tablePics = [tablePool0Pics, tablePool1Pics, tablePool2Pics];

function buildProbabilityUndertables() {
    let probabilityUndertableMatrix = [];
    for (let i = 0; i< tableRows.length; i++) {
        probabilityUndertableMatrix.push(tableRows[i].querySelectorAll(".display-table-cell"));
    }
    return probabilityUndertableMatrix;
}

const probabilityUndertables = buildProbabilityUndertables();

function buildTableCells() {
    let tableCells = [];
    for (let i = 0; i<tableRows.length; i++) {
        let currentRow = [];
        for (let j=0; j<probabilityUndertables[i].length; j++) {
            currentRow.push(probabilityUndertables[i][j].querySelectorAll("td"));
        }
        tableCells.push(currentRow);
    }
    return tableCells;
}

const tableCells = buildTableCells();

function buildTableCellProbs() {
    let tableCellProbs = [];
    for (let i = 0; i<tableCells.length; i++) {
        let currentRow = [];
        for (let j=0; j<tableCells[i].length; j++) {
            currentCell = [];
            for (let k=0; k<tableCells[i][j].length; k++) {
                currentCell.push(tableCells[i][j][k].querySelector(".prob-space"));
            }
            currentRow.push(currentCell);
        }
        tableCellProbs.push(currentRow);
    }
    return tableCellProbs;
}

const tableCellProbs = buildTableCellProbs();

const TEAM_IMGS = [["images/TES.png", "images/G2.png", "images/DWG.png", "images/TSM.png"],
                   ["images/JDG.png", "images/SN.png", "images/FNC.png", "images/DRX.png"],
                   ["images/RGE.png", "images/GEN.png", "images/FLY.png", "images/MCX.png"]];

/* updateTableCellImgs takes an Advancer and updates the display table
 * so that the images of the selected teams are in the correct cells.
 */
function updateTableCellImgs(advancer) {
    let myBoard = advancer.node.board;
    for (let i = 0; i<4; i++) {
        for (let j = 0; j<3; j++) {
            if (myBoard.board[i][j] === EMPTY) {
                tablePics[j][i].src="images/blank.svg";
                tablePics[j][i].style.visibility="hidden";
            } else {
                let team = myBoard.board[i][j];
                tablePics[j][i].src = TEAM_IMGS[team.pool][team.numInPool];
                tablePics[j][i].style.visibility="visible";
            }
        }
    }
}

function roundToProb(n) {
    return Math.floor(100*n+0.5);
}

function percColor(val,max) {
    let x = val/max;
    return "rgba(0,255,0,"+x+")";
}

/* updateTableCellProbTables takes an Advancer and updates the table of probabilities
 * for the positions which have not been filled yet with the probability of
 * a given team will be placed in that position.
 */
function updateTableCellProbTables(advancer) {
    let myBoard = advancer.node.board;
    let mySpray = advancer.getSpray();
    let totalPossibilities = 0;
    for (let i = 0; i<4; i++) {
        totalPossibilities = totalPossibilities + mySpray[0][0][i];
    }
    for (let i = 0; i<3; i++) {
        for (let j=0; j<4; j++) {
            for (let k=0; k<4; k++) {
                let n = mySpray[j][i][k];
                tableCellProbs[i][j][k].textContent = roundToProb(n/totalPossibilities);
                tableCells[i][j][k].style.backgroundColor = percColor(n,totalPossibilities);
            }
            if (myBoard.board[j][i] !== EMPTY) {
                probabilityUndertables[i][j].style.visibility="hidden";
            } else {
                probabilityUndertables[i][j].style.visibility="visible";
            }
        }
    }
}

function updateTable(advancer) {
    updateTableCellProbTables(advancer);
    updateTableCellImgs(advancer);
}

function updatePage(selectState,advancer, orangeIndex) {
    updateTable(advancer);
    updateSelector(selectState,advancer,orangeIndex);
}

/* A PageState is an object which keeps track of 
 * - an Advancer representing the saved board state,
 * - an Advancer representing the currently displayed board state,
 * - the state of the selector.
 */
function PageState(selectState) {
    this.savedState = STARTING_ADVANCER;
    this.currentState = STARTING_ADVANCER;
    this.selectState = selectState;
}

PageState.prototype.returnToSave = function() {
    let prevNextPoolIndex = this.currentState.selectorNextPoolIndex();
    let newNextPoolIndex = this.savedState.selectorNextPoolIndex();
    this.currentState = this.savedState;
    this.selectState.toggle(prevNextPoolIndex,newNextPoolIndex);
}

PageState.prototype.saveState = function() {
    this.savedState = this.currentState;
}

PageState.prototype.resetSaveState = function() {
    this.savedState = STARTING_ADVANCER;
}

PageState.prototype.drawNext = function() {
    this.currentState = this.currentState.drawNext();
    let n = this.currentState.nextPoolIndex();
    if (this.currentState.picks.length % 4 === 0 && n !== 3) {
        this.selectState.toggle(n, n-1);
    }
}

PageState.prototype.advance = function(team) {
    this.currentState = this.currentState.advance(team);
    let n = this.currentState.nextPoolIndex();
    if (this.currentState.picks.length % 4 === 0 && n !== 3) {
        this.selectState.toggle(n, n-1);
    }
}

PageState.prototype.drawTilEnd = function() {
    while (this.currentState.canDrawNext()) {
        this.currentState = this.currentState.drawNext();
    }
}

PageState.prototype.simulateFromHere = function() {
    let prevNextPoolIndex = this.currentState.selectorNextPoolIndex();
    this.drawTilEnd();
    this.selectState.toggle(prevNextPoolIndex, 2);
}

PageState.prototype.simulateFromStart = function() {
    let prevNextPoolIndex = this.currentState.selectorNextPoolIndex();
    this.currentState = STARTING_ADVANCER;
    this.drawTilEnd();
    this.selectState.toggle(prevNextPoolIndex,2);
}

PageState.prototype.simulateFromSave = function() {
    let prevNextPoolIndex = this.currentState.selectorNextPoolIndex();
    this.currentState = this.savedState;
    this.drawTilEnd();
    this.selectState.toggle(prevNextPoolIndex,2);
}

// The variable keeping track of the page state.
let pageState = new PageState(new SelectorState([true,false,false]));

/* updateWithCurrentState() updates the webpage to agree with 
 * the global variable pageState above.
 */
function updateWithCurrentState() {
    updatePage(pageState.selectState, 
               pageState.currentState, 
               pageState.currentState.nextPoolIndex());
}

window.onload = function(){
    updateWithCurrentState();
}

//listeners advancing the current board state when a selector is clicked
for (let i=0; i<selectorPics.length; i++) {
    for (let j=0; j<selectorPics[i].length; j++) {
        selectorPics[i][j].addEventListener("click", function() {
            let team = LIST_OF_TEAMS[i][j];
            if (pageState.currentState.canAdvance(team)) {
                pageState.advance(team);
                updateWithCurrentState();
            }
        });
    }
}

// listeners previewing the next board state when hovered over a team in the selector
for (let i=0; i<selectorPics.length; i++) {
    for (let j=0; j<selectorPics[i].length; j++) {
        selectorPics[i][j].onmouseover = function() {
            let team = LIST_OF_TEAMS[i][j];
            if (pageState.currentState.canAdvance(team)) {
                let previewAdvancer = pageState.currentState.advance(team);
                updatePage(pageState.selectState, 
                           previewAdvancer, 
                           pageState.currentState.nextPoolIndex());
            }
        };
    }
}

// returning to the current state after previewing during hover over a team in the selector
for (let i=0; i<selectorPics.length; i++) {
    for (let j=0; j<selectorPics[i].length; j++) {
        selectorPics[i][j].onmouseout = function() {
            updateWithCurrentState();
        };
    }
}

const drawNextButton = document.querySelector("#draw-next-button");
const saveStateButton = document.querySelector("#save-state-button");
const resetSaveStateButton = document.querySelector("#reset-save-state-button");
const returnToSaveButton = document.querySelector("#return-to-save-button");
const simulateFromStartButton = document.querySelector("#simulate-from-start-button");
const simulateFromHereButton = document.querySelector("#simulate-from-here-button");
const simulateFromSaveButton = document.querySelector("#simulate-from-save-button");

drawNextButton.addEventListener("click", function(){
    pageState.drawNext();
    updateWithCurrentState();
});

saveStateButton.addEventListener("click", function() {
    pageState.saveState();
});

resetSaveStateButton.addEventListener("click", function() {
    pageState.resetSaveState();
});

returnToSaveButton.addEventListener("click", function(){
    pageState.returnToSave();
    updateWithCurrentState();
});

simulateFromStartButton.addEventListener("click", function(){
    pageState.simulateFromStart();
    updateWithCurrentState();
});

simulateFromHereButton.addEventListener("click", function(){
    pageState.simulateFromHere();
    updateWithCurrentState();
});

simulateFromSaveButton.addEventListener("click", function(){
    pageState.simulateFromSave();
    updateWithCurrentState();
});
