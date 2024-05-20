
class Tile extends google.maps.OverlayView {
    bounds;
    src;
    div;
    loading;
    constructor(bounds, src) {
        super();
        this.bounds = bounds;
        this.src = src;
        this.loading = false;

        this.div = document.createElement("div");
        this.div.style.borderStyle = "none";
        this.div.style.borderWidth = "0px";
        this.div.style.position = "absolute";
        this.div.className = "tileContainer";

        // Create the img element and attach it to the div.
        const img = document.createElement("img");

        img.src = this.src;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.position = "absolute";
        this.div.appendChild(img);

    }
    /**
     * onAdd is called when the map's panes are ready and the overlay has been
     * added to the map.
     */
    onAdd() {

        // Add the element to the "overlayLayer" pane.
        const panes = this.getPanes();

        panes.overlayLayer.appendChild(this.div);
        this.setLoading(true);
        
    }
    draw() {
        // We use the south-west and north-east
        // coordinates of the overlay to peg it to the correct position and size.
        // To do this, we need to retrieve the projection from the overlay.
        const overlayProjection = this.getProjection();
        // Retrieve the south-west and north-east coordinates of this overlay
        // in LatLngs and convert them to pixel coordinates.
        // We'll use these coordinates to resize the div.
        const sw = overlayProjection.fromLatLngToDivPixel(
            this.bounds.getSouthWest()
        );
        const ne = overlayProjection.fromLatLngToDivPixel(
            this.bounds.getNorthEast()
        );

        // Resize the image's div to fit the indicated dimensions.

        this.div.style.left = sw.x + "px";
        this.div.style.top = ne.y + "px";
        this.div.style.width = ne.x - sw.x + "px";
        this.div.style.height = sw.y - ne.y + "px";

    }
    /**
     * The onRemove() method will be called automatically from the API if
     * we ever set the overlay's map property to 'null'.
     */
    onRemove() {
        this.div.parentNode.removeChild(this.div);
    }
    /**
     *  Set the visibility to 'hidden' or 'visible'.
     */
    hide() {
        this.div.style.visibility = "hidden";
    }
    show() {
        this.div.style.visibility = "visible";
    }
    toggle() {
        if (this.div.style.visibility === "hidden") {
            this.show();
        } else {
            this.hide();
        }

    }
    async setSrc(src) {
        const img = this.div.querySelector('img');
        img.src = src;
        this.src = src;
        await img.decode();
        this.setLoading(false);
    }
    toggleDOM(map) {
        if (this.getMap()) {
            this.setMap(null);
        } else {
            this.setMap(map);
        }
    }
    setLoading(enabled) {
        this.loading = enabled;
        this.div.classList.remove('tileContainer--loading');
        requestAnimationFrame(() => {
            this.div.classList.toggle('tileContainer--selected', enabled);
        });
    }
}