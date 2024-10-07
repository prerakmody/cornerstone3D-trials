import * as config from './config.js';

async function createViewPortsHTML() {

    // let viewportGridDiv=config.getViewportGridDiv(), viewportPTGridDiv=config.getViewportPTGridDiv();
    // let axialDiv=config.getAxialDiv(), sagittalDiv=config.getSagittalDiv(), coronalDiv=config.getCoronalDiv();
    // let axialDivPT=config.getAxialDivPT(), sagittalDivPT=config.getSagittalDivPT(), coronalDivPT=config.getCoronalDivPT();
    // let serverStatusDiv=config.getServerStatusDiv(), serverStatusCircle=config.getServerStatusCircle(), serverStatusTextDiv=config.getServerStatusTextDiv();
    // let axialSliceDiv=config.getAxialSliceDiv(), sagittalSliceDiv=config.getSagittalSliceDiv(), coronalSliceDiv=config.getCoronalSliceDiv();
    // let axialSliceDivPT=config.getAxialSliceDivPT(), sagittalSliceDivPT=config.getSagittalSliceDivPT(), coronalSliceDivPT=config.getCoronalSliceDivPT();
    let viewportGridDiv=config.viewportGridDiv, viewportCTGridDiv=config.viewportCTGridDiv, viewportPTGridDiv=config.viewportPTGridDiv;
    let axialDiv=config.axialDiv, sagittalDiv=config.sagittalDiv, coronalDiv=config.coronalDiv;
    let axialDivPT=config.axialDivPT, sagittalDivPT=config.sagittalDivPT, coronalDivPT=config.coronalDivPT;
    let serverStatusDiv=config.serverStatusDiv, serverStatusCircle=config.serverStatusCircle, serverStatusTextDiv=config.serverStatusTextDiv;
    let axialSliceDiv=config.axialSliceDiv, sagittalSliceDiv=config.sagittalSliceDiv, coronalSliceDiv=config.coronalSliceDiv;
    let axialSliceDivPT=config.axialSliceDivPT, sagittalSliceDivPT=config.sagittalSliceDivPT, coronalSliceDivPT=config.coronalSliceDivPT;
    let mouseHoverDiv=config.mouseHoverDiv, canvasPosHTML=config.canvasPosHTML, ctValueHTML=config.ctValueHTML, ptValueHTML=config.ptValueHTML;
    let thumbnailContainerDiv=config.thumbnailContainerDiv;
    
    ////////////////////////////////////////////////////////////////////// Step 0 - Create viewport grid
    if (1) {
        // Step 0.1 - Create content div
        const contentDiv = document.getElementById(config.contentDivId);
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'row';

        // Step 0.1.1 - Create viewPortGridDiv container div
        viewportGridDiv = document.createElement('div');
        viewportGridDiv.id = config.viewportDivId;
        viewportGridDiv.style.display = 'flex';
        viewportGridDiv.style.flexDirection = 'column';
        contentDiv.appendChild(viewportGridDiv);

        // Step 0.1.2 - Create thumbnail container div
        thumbnailContainerDiv = document.createElement('div');
        thumbnailContainerDiv.id = config.thumbnailContainerDivId;
        thumbnailContainerDiv.style.display = 'flex';
        thumbnailContainerDiv.style.flexDirection = 'column';
        thumbnailContainerDiv.style.overflowY = 'scroll';
        contentDiv.appendChild(thumbnailContainerDiv);

        // Step 0.2 - Create viewport grid div (for CT)
        viewportCTGridDiv = document.createElement('div');
        viewportCTGridDiv.id = config.viewPortCTDivId;
        viewportCTGridDiv.style.display = 'flex';
        viewportCTGridDiv.style.flexDirection = 'row';
        viewportCTGridDiv.oncontextmenu = (e) => e.preventDefault(); // Disable right click
        // contentDiv.appendChild(viewportCTGridDiv);
        viewportGridDiv.appendChild(viewportCTGridDiv);
        
        // Step 0.3 - Create viewport grid div (for PET)
        viewportPTGridDiv = document.createElement('div');
        viewportPTGridDiv.id = config.viewPortPTDivId;
        viewportPTGridDiv.style.display = 'flex';
        viewportPTGridDiv.style.flexDirection = 'row';
        viewportPTGridDiv.oncontextmenu = (e) => e.preventDefault(); // Disable right click
        // contentDiv.appendChild(viewportPTGridDiv);
        viewportGridDiv.appendChild(viewportPTGridDiv);
    }

    ////////////////////////////////////////////////////////////////////// Step 1 - Create viewport elements (Axial, Sagittal, Coronal)
    if (1){

        // Step 1.1.0 - Select width as percentage of window width
        const widthOfDivInPx = window.innerWidth * config.viewWidthPerc + 'px';

        // Step 1.1.1 - element for axial view (CT)
        axialDiv = document.createElement('div');
        // axialDiv.style.width = '500px'; 
        // axialDiv.style.height = '500px';
        axialDiv.style.width = widthOfDivInPx;
        axialDiv.style.height = widthOfDivInPx;
        axialDiv.id = config.axialID;
        viewportCTGridDiv.appendChild(axialDiv);

        // Step 1.1.2 - element for sagittal view (CT)
        sagittalDiv = document.createElement('div');
        // sagittalDiv.style.width = '500px';
        // sagittalDiv.style.height = '500px';
        sagittalDiv.style.width = widthOfDivInPx;
        sagittalDiv.style.height = widthOfDivInPx;
        sagittalDiv.id = config.sagittalID;
        viewportCTGridDiv.appendChild(sagittalDiv);

        // Step 1.1.2 - element for coronal view (CT)
        coronalDiv = document.createElement('div');
        // coronalDiv.style.width = '500px';
        // coronalDiv.style.height = '500px';
        coronalDiv.style.width = widthOfDivInPx;
        coronalDiv.style.height = widthOfDivInPx;
        coronalDiv.id = config.coronalID;
        viewportCTGridDiv.appendChild(coronalDiv);

        // Step 1.2.1 - element for axial view (PT)
        axialDivPT = document.createElement('div');
        // axialDivPT.style.width = '500px';
        // axialDivPT.style.height = '500px';
        axialDivPT.style.width = widthOfDivInPx;
        axialDivPT.style.height = widthOfDivInPx;
        axialDivPT.id = config.axialPTID;
        viewportPTGridDiv.appendChild(axialDivPT);

        // Step 1.2.2 - element for sagittal view (PT)
        sagittalDivPT = document.createElement('div');
        // sagittalDivPT.style.width = '500px';
        // sagittalDivPT.style.height = '500px';
        sagittalDivPT.style.width = widthOfDivInPx;
        sagittalDivPT.style.height = widthOfDivInPx;
        sagittalDivPT.id = config.sagittalPTID;
        viewportPTGridDiv.appendChild(sagittalDivPT);

        // Step 1.2.3 - element for coronal view (PT)
        coronalDivPT = document.createElement('div');
        // coronalDivPT.style.width = '500px';
        // coronalDivPT.style.height = '500px';
        coronalDivPT.style.width = widthOfDivInPx;
        coronalDivPT.style.height = widthOfDivInPx;
        coronalDivPT.id = config.coronalPTID;
        viewportPTGridDiv.appendChild(coronalDivPT);
    }

    ////////////////////////////////////////////////////////////////////// Step 2 - On the top-left of config.axialDiv add a div to indicate server status
    if (1){

        axialDiv.style.position = 'relative';
        serverStatusDiv = document.createElement('div');
        serverStatusDiv.style.position = 'absolute'; // Change to absolute
        serverStatusDiv.style.top = '3';
        serverStatusDiv.style.left = '3';
        serverStatusDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        serverStatusDiv.style.color = 'white';
        serverStatusDiv.style.padding = '5px';
        serverStatusDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        serverStatusDiv.id = 'serverStatusDiv';
        axialDiv.appendChild(serverStatusDiv);

        // Step 2.1.2 - add a blinking circle with red color to serverStatusDiv
        serverStatusCircle = document.createElement('div');
        serverStatusCircle.style.width = '10px';
        serverStatusCircle.style.height = '10px';
        serverStatusCircle.style.backgroundColor = 'red';
        serverStatusCircle.style.borderRadius = '50%';
        serverStatusCircle.style.animation = 'blinker 1s linear infinite';
        serverStatusDiv.appendChild(serverStatusCircle);
        const style = document.createElement('style');
        style.type = 'text/css';
        const keyframes = `
            @keyframes blinker {
                50% {
                    opacity: 0;
                }
            }
        `;
        style.appendChild(document.createTextNode(keyframes));
        document.head.appendChild(style);

        // Add a div, in serverStatusDiv, where if I hover over it, shows me text related to server status
        serverStatusTextDiv = document.createElement('div');
        serverStatusTextDiv.style.position = 'absolute'; // Change to absolute
        serverStatusTextDiv.style.top = '0';
        serverStatusTextDiv.style.left = '20';
        serverStatusTextDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        serverStatusTextDiv.style.color = 'white';
        serverStatusTextDiv.style.padding = '5px';
        serverStatusTextDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        serverStatusTextDiv.id = 'serverStatusTextDiv';
        serverStatusTextDiv.style.display = 'none';
        serverStatusTextDiv.innerHTML = 'Server Status: <br> - Red: Server is not running <br> - Green: Server is running';
        serverStatusTextDiv.style.width = 0.5*parseInt(axialDiv.style.width);
        serverStatusDiv.appendChild(serverStatusTextDiv);

        config.setServerStatusCircle(serverStatusCircle);
        config.setServerStatusTextDiv(serverStatusTextDiv);

        // Add the hover text
        serverStatusDiv.addEventListener('mouseover', function() {
            serverStatusTextDiv.style.display = 'block';
        });
        serverStatusTextDiv.addEventListener('mouseout', function() {
            serverStatusTextDiv.style.display = 'none';
        });
    }

    ////////////////////////////////////////////////////////////////////// Step 3 - On the top-right of divs add a div for the slice number
    if (1){

        // Step 3.1 - On the top-right of config.axialDiv add a div for the slice number
        axialDiv.style.position = 'relative';
        axialSliceDiv = document.createElement('div');
        axialSliceDiv.style.position = 'absolute'; 
        axialSliceDiv.style.top = '3';
        axialSliceDiv.style.right = '3';
        axialSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        axialSliceDiv.style.color = 'white';
        axialSliceDiv.style.padding = '5px';
        axialSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        axialSliceDiv.id = 'axialSliceDiv';
        axialDiv.appendChild(axialSliceDiv);

        // Step 3.2 - On the  top-right of sagittalDiv add a div for the slice number
        sagittalDiv.style.position = 'relative';
        sagittalSliceDiv = document.createElement('div');
        sagittalSliceDiv.style.position = 'absolute'; 
        sagittalSliceDiv.style.top = '0';
        sagittalSliceDiv.style.right = '20';
        sagittalSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        sagittalSliceDiv.style.color = 'white';
        sagittalSliceDiv.style.padding = '5px';
        sagittalSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        sagittalSliceDiv.id = 'sagittalSliceDiv';
        sagittalDiv.appendChild(sagittalSliceDiv);

        // Step 3.3 - On the  top-right of coronalDiv add a div for the slice number
        coronalDiv.style.position = 'relative';
        coronalSliceDiv = document.createElement('div');
        coronalSliceDiv.style.position = 'absolute'; 
        coronalSliceDiv.style.top = '0';
        coronalSliceDiv.style.right = '20';
        coronalSliceDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        coronalSliceDiv.style.color = 'white';
        coronalSliceDiv.style.padding = '5px';
        coronalSliceDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        coronalSliceDiv.id = 'coronalSliceDiv';
        coronalDiv.appendChild(coronalSliceDiv);

        // Step 3.4 - On the  top-right of axialDivPT add a div for the slice number
        axialDivPT.style.position = 'relative'; // Change to absolute
        axialSliceDivPT = document.createElement('div');
        axialSliceDivPT.style.position = 'absolute'; 
        axialSliceDivPT.style.top = '0';
        axialSliceDivPT.style.right = '20';
        axialSliceDivPT.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        axialSliceDivPT.style.color = 'white';
        axialSliceDivPT.style.padding = '5px';
        axialSliceDivPT.style.zIndex = '1000'; // Ensure zIndex is a string
        axialSliceDivPT.id = 'axialSliceDivPT';
        axialDivPT.appendChild(axialSliceDivPT);
        
        // Step 3.5 - On the  top-right of sagittalDivPT add a div for the slice number
        sagittalDivPT.style.position = 'relative'; // Change to absolute
        sagittalSliceDivPT = document.createElement('div');
        sagittalSliceDivPT.style.position = 'absolute'; 
        sagittalSliceDivPT.style.top = '0';
        sagittalSliceDivPT.style.right = '20';
        sagittalSliceDivPT.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        sagittalSliceDivPT.style.color = 'white';
        sagittalSliceDivPT.style.padding = '5px';
        sagittalSliceDivPT.style.zIndex = '1000'; // Ensure zIndex is a string
        sagittalSliceDivPT.id ='sagittalSliceDivPT';
        sagittalDivPT.appendChild(sagittalSliceDivPT);

        // Step 3.6 - On the  top-right of coronalDivPT add a div for the slice number
        coronalDivPT.style.position = 'relative'; // Change to absolute
        coronalSliceDivPT = document.createElement('div');
        coronalSliceDivPT.style.position = 'absolute';
        coronalSliceDivPT.style.top = '0';
        coronalSliceDivPT.style.right = '20';
        coronalSliceDivPT.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        coronalSliceDivPT.style.color = 'white';
        coronalSliceDivPT.style.padding = '5px';
        coronalSliceDivPT.style.zIndex = '1000'; // Ensure zIndex is a string
        coronalSliceDivPT.id = 'coronalSliceDivPT';
        coronalDivPT.appendChild(coronalSliceDivPT);

    }

    ////////////////////////////////////////////////////////////////////// Step 4 - Add a div to show mouse hover
    if (1){
        mouseHoverDiv = document.createElement('div');
        mouseHoverDiv.style.position = 'absolute'; // Change to absolute
        mouseHoverDiv.style.bottom = '3';
        mouseHoverDiv.style.left = '3';
        mouseHoverDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        mouseHoverDiv.style.color = 'white';
        mouseHoverDiv.style.padding = '5px';
        mouseHoverDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        mouseHoverDiv.id = 'mouseHoverDiv';
        mouseHoverDiv.style.fontSize = '10px'
        axialDiv.appendChild(mouseHoverDiv);

        canvasPosHTML = document.createElement('p');
        ctValueHTML = document.createElement('p');
        ptValueHTML = document.createElement('p');
        canvasPosHTML.innerText = 'Canvas position:';
        ctValueHTML.innerText = 'CT value:';
        ptValueHTML.innerText = 'PT value:';
        
        mouseHoverDiv.appendChild(canvasPosHTML);
        mouseHoverDiv.appendChild(ctValueHTML);
        mouseHoverDiv.appendChild(ptValueHTML);
    }

    ////////////////////////////////////////////////////////////////////// Step 5 - Add a popup button for user input on page reload
    if (1){

        // Function to show a custom alert dialog with input elements
        function showCustomAlert() {
            // Create the parent container
            const dialogSuper = document.createElement('div');
            dialogSuper.style.position = 'fixed';
            dialogSuper.style.left = '0';
            dialogSuper.style.top = '0';
            dialogSuper.style.width = '100%';
            dialogSuper.style.height = '100%';
            dialogSuper.style.zIndex = '1000';
            dialogSuper.style.display = 'flex';
            dialogSuper.style.justifyContent = 'center';
            dialogSuper.style.alignItems = 'center';

            // Create the background overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.left = '0';
            overlay.style.top = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

            // Create the dialog container
            const dialog = document.createElement('div');
            dialog.style.position = 'relative';
            dialog.style.zIndex = '1001';
            dialog.style.backgroundColor = 'white';
            dialog.style.padding = '20px';
            dialog.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            dialog.style.borderRadius = '5px'

            // Create the dialog content
            const title = document.createElement('h2');
            title.textContent = 'Enter Name';
            dialog.appendChild(title);

            const input1 = document.createElement('input');
            input1.type = 'text';
            input1.placeholder = 'Enter first name';
            dialog.appendChild(input1);

            const input2 = document.createElement('input');
            input2.type = 'text';
            input2.placeholder = 'Enter second name';
            dialog.appendChild(input2);

            const submitButton = document.createElement('button');
            submitButton.textContent = 'Submit';
            dialog.appendChild(submitButton);

            // const closeButton = document.createElement('button');
            // closeButton.textContent = 'Close';
            // dialog.appendChild(closeButton);

            // Append the dialog and overlay to the parent container
            dialogSuper.appendChild(overlay);
            dialogSuper.appendChild(dialog);

            // Append the parent container to the body
            document.body.appendChild(dialogSuper);

            // Handle the submit button click
            submitButton.onclick = function() {
                const userCredFirstName = input1.value;
                const userCredLastName = input2.value;
                console.log('\n - [dialog] First name:', userCredFirstName);
                console.log(' - [dialog] Second name:', userCredLastName);
                if (userCredFirstName === '' || userCredLastName === '' || userCredFirstName === null || userCredLastName === null) {
                    alert('Please enter a valid name');
                    return;
                }else{
                    config.setUserCredFirstName(userCredFirstName);
                    config.setUserCredLastName(userCredLastName);
                    document.body.removeChild(dialogSuper);
                }
                
            };

            // Handle the close button click
            // closeButton.onclick = function() {
            //     document.body.removeChild(dialogSuper);
            // };
        }

        // Show the custom alert dialog on page load
        document.addEventListener('DOMContentLoaded', (event) => {
            showCustomAlert();
        });

    }

    ////////////////////////////////////////////////////////////////////// Step 99 - Return all the elements
    config.setViewportGridDiv(viewportGridDiv);
    config.setThumbnailContainerDiv(thumbnailContainerDiv);
    config.setViewportCTGridDiv(viewportCTGridDiv);
    config.setViewportPTGridDiv(viewportPTGridDiv);
    
    config.setAxialDiv(axialDiv);
    config.setSagittalDiv(sagittalDiv);
    config.setCoronalDiv(coronalDiv);
    config.setAxialDivPT(axialDivPT);
    config.setSagittalDivPT(sagittalDivPT);
    config.setCoronalDivPT(coronalDivPT);
    config.setServerStatusDiv(serverStatusDiv);
    
    config.setServerStatusCircle(serverStatusCircle);
    config.setServerStatusTextDiv(serverStatusTextDiv);
    
    config.setAxialSliceDiv(axialSliceDiv);
    config.setSagittalSliceDiv(sagittalSliceDiv);
    config.setCoronalSliceDiv(coronalSliceDiv);
    config.setAxialSliceDivPT(axialSliceDivPT);
    config.setSagittalSliceDivPT(sagittalSliceDivPT);
    config.setCoronalSliceDivPT(coronalSliceDivPT);
    
    config.setMouseHoverDiv(mouseHoverDiv);
    config.setCanvasPosHTML(canvasPosHTML);
    config.setCTValueHTML(ctValueHTML);
    config.setPTValueHTML(ptValueHTML);

    config.setViewPortDivsAll([axialDiv, sagittalDiv, coronalDiv, axialDivPT, sagittalDivPT, coronalDivPT]);
    setThumbnailContainerHeightAndWidth();

    // return {
    //     contentDiv, config.viewportGridDiv, config.axialDiv, sagittalDiv, coronalDiv, axialSliceDiv, sagittalSliceDiv, coronalSliceDiv
    //     , serverStatusCircle, serverStatusTextDiv
    //     , config.viewportPTGridDiv, axialDivPT, sagittalDivPT, coronalDivPT, axialSliceDivPT, sagittalSliceDivPT, coronalSliceDivPT
    // };
}

async function setThumbnailContainerHeightAndWidth(){
    let thumbnailContainerDiv=config.thumbnailContainerDiv;
    let thumbnailContainerHeight=0.9*window.innerHeight;
    thumbnailContainerDiv.style.height=thumbnailContainerHeight+'px';

    config.thumbnailContainerDiv.style.height = `${config.viewportGridDiv.style.height}px`;
    config.thumbnailContainerDiv.style.width = window.innerWidth * (1-3*config.viewWidthPerc) + 'px';
}

function waitForCredentials() {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            if (config.userCredFirstName && config.userCredLastName) {
                clearInterval(interval);
                resolve();
            }
        }, 100); // Check every 100ms
    });
}

export { createViewPortsHTML, waitForCredentials };