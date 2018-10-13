
import { Rectangle }         from 'components/rectangle';
import { ColliderComponent } from 'components/colliderComponent';


// Stocke les collisions rectangulaires.
// Cette structure est optimisée pour les collisions statiques :
// En effet, actualiser une collision ayant bougé revient à l'enlever puis la rajouter au QuadTree.
// Si la collision ne bouge pas, ces opérations coûteuses sont évitées.
export class QuadTree {

    // Nombres de collisions à partir desquels l'arbre est ramifié ou élagué.
    // DIVIDE_THRESHOLD doit être supérieur à MERGE_THRESHOLD.
    static DIVIDE_THRESHOLD = 10;
    static MERGE_THRESHOLD = 5;

    // Indique si le structure est une feuille de l'arbre (sinon, un noeud avec quatre enfants).
    private leaf = true;

    // Le rectangle couvert par l'arbre.
    private area : Rectangle;

    // Le nombre de colliders contenus.
    private count = 0;

    // Les enfants de l'arbre, si c'est un noeud.
    private childs = new Array<QuadTree>();

    // Les colliders touchant le rectange de l'arbre, si c'est une feuille.
    private colliders = new Set<ColliderComponent>();
    
    // Créé l'arbre racine avec toute la zone qu'il couvre.
    constructor(area : Rectangle) {
        this.area = area;
    }

    // Renvoie les collisions qui pourraient être en contact avec la collision passée.
    getNeighboors(collider : ColliderComponent) : Iterable<ColliderComponent> {
        if (this.leaf) {
            // Renvoie les collisions de la feuille.
            return this.colliders;
        }
        else {
            // Renvoie l'union des collisions contenues dans les arbres touchant la collision
            // passée.
            let neighboors = new Set<ColliderComponent>();
            for (let i = 0; i < 4; ++i) {
                if (collider.area.intersectsWith(this.childs[i].area)) {
                    const news = this.childs[i].getNeighboors(collider);
                    neighboors = new Set([...neighboors, ...news]);
                }
            }
            return neighboors;
        }
    }

    // Tente d'ajouter une collision à l'arbre. Indique si l'opération a réussi.
    add(collider : ColliderComponent) : boolean {
        if (this.leaf) {
            // Ajoute la collision à celles stockées, si elle touche la zone de la feuille.
            if (!this.area.intersectsWith(collider.area)) return false;
            this.colliders.add(collider);
            this.count += 1;

            // En cas de succès, vérifie si il faut subdiviser la feuille.
            if (this.count >= QuadTree.DIVIDE_THRESHOLD) this.subdivise();
            return true;
        }
        else {
            // Ajoute la collision aux enfants (succès si au moins l'un d'entre eux l'accepte).
            let added = false;
            for (let i = 0; i < 4; ++i) {
                if (!collider.area.intersectsWith(this.childs[i].area)) continue;
                added = true;
                this.childs[i].add(collider);
            }
            if (added) this.count += 1;
            return added;
        }
    }

    // Tente de retirer une collision à l'arbre. Indique si l'opération a réussi.
    // Si 'checkBounds' est mis à vrai, va seulement vérifier les enfants touchant la collision.
    // Cela permet finir plus vite l'opération, mais ne doit être utilisé que si le composant n'a
    // pas bougé depuis son insertion.
    remove(collider : ColliderComponent, checkBounds = false) : boolean {
        if (this.leaf) {
            // Tente de retirer la collision de celles stockées.
            const deleted = this.colliders.delete(collider);
            if (deleted) this.count -= 1;
            return deleted;
        }
        else {
            // Tente de retirer la collision des enfants.
            let deleted = false;
            for (let i = 0; i < 4; ++i) {
                if (checkBounds && !collider.area.intersectsWith(this.childs[i].area)) continue;
                if (this.childs[i].remove(collider)) deleted = true;
            }
            if (deleted) {
                this.count -= 1;

                // En cas de succès, vérifie si il faut fusionner le noeud avec ses enfants.
                if (this.count <= QuadTree.MERGE_THRESHOLD) this.merge();
            }
            return deleted;
        }
    }

    // Retire la collision (en supposant qu'elle ait pu bouger) puis la réinsère dans l'arbre.
    update(collider : ColliderComponent) : boolean {
        this.remove(collider, false);
        return this.add(collider);
    }

    // Indique le nombre de collisions stockées.
    size() : number {
        return this.count;
    }

    // Change une feuille en noeud contenant quatre nouvelles feuilles.
    // Les collisions stockées sont redistribuées aux feuilles.
    private subdivise() {
        if (!this.leaf) throw new Error('Tried to subdivise a QuadTree node');

        // Créé les quatre rectangles couvrant la même zone que le rectangle courant.
        const newW = (this.area.xMax - this.area.xMin) / 2;
        const newH = (this.area.yMax - this.area.yMin) / 2;
        for (let x = this.area.xMin + newW / 2; x <= this.area.xMax; x += newW) {
            for (let y = this.area.yMin + newH / 2; y <= this.area.yMax; y += newH) {
                const area = new Rectangle({
                    x: x,
                    y: y,
                    width:  newW,
                    height: newH,
                });
                const tree = new QuadTree(area);
                for (const collider of this.colliders) {
                    if (collider.area.intersectsWith(area)) tree.add(collider);
                }
                this.childs.push(tree);
            }
        }
        this.colliders.clear();
        this.leaf = false;
    }

    // Change un noeud en feuille.
    // Récupère les collisions contenues dans ses anciens enfants.
    private merge() {
        if (this.leaf) throw new Error('Tried to merge a QuadTree leaf');

        for (const child of this.childs) {
            
            // Change l'enfant en feuille si ce n'est pas déjà le cas.
            if (!child.leaf) child.merge();
            for (const collider of child.colliders) {
                this.add(collider);
            }
        }
        this.childs = new Array<QuadTree>();
        this.leaf = true;
    }
}
