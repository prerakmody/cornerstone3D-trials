import * as config from './config.js';
import * as cornerstone3DTools from '@cornerstonejs/tools';

// ------------------------------------- HTML Element (Set 1)
async function createViewPortsHTML() {

    // let viewportGridDiv=config.getViewportGridDiv(), viewportPTGridDiv=config.getViewportPTGridDiv();
    // let axialDiv=config.getAxialDiv(), sagittalDiv=config.getSagittalDiv(), coronalDiv=config.getCoronalDiv();
    // let axialDivPT=config.getAxialDivPT(), sagittalDivPT=config.getSagittalDivPT(), coronalDivPT=config.getCoronalDivPT();
    // let serverHealthDiv=config.getserverHealthDiv(), serverStatusCircle=config.getServerStatusCircle(), serverStatusTextDiv=config.getServerStatusTextDiv();
    // let axialSliceDiv=config.getAxialSliceDiv(), sagittalSliceDiv=config.getSagittalSliceDiv(), coronalSliceDiv=config.getCoronalSliceDiv();
    // let axialSliceDivPT=config.getAxialSliceDivPT(), sagittalSliceDivPT=config.getSagittalSliceDivPT(), coronalSliceDivPT=config.getCoronalSliceDivPT();
    let viewportGridDiv=config.viewportGridDiv, viewportCTGridDiv=config.viewportCTGridDiv, viewportPTGridDiv=config.viewportPTGridDiv;
    let axialDiv=config.axialDiv, sagittalDiv=config.sagittalDiv, coronalDiv=config.coronalDiv;
    let axialDivPT=config.axialDivPT, sagittalDivPT=config.sagittalDivPT, coronalDivPT=config.coronalDivPT;
    let serverHealthDiv=config.serverHealthDiv, serverStatusCircle=config.serverStatusCircle, serverStatusTextDiv=config.serverStatusTextDiv;
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
        serverHealthDiv = document.createElement('div');
        serverHealthDiv.style.position = 'absolute'; // Change to absolute
        serverHealthDiv.style.top = '3';
        serverHealthDiv.style.left = '3';
        serverHealthDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        serverHealthDiv.style.color = 'white';
        serverHealthDiv.style.padding = '5px';
        serverHealthDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        serverHealthDiv.id = 'serverHealthDiv';
        axialDiv.appendChild(serverHealthDiv);

        // Step 2.1.2 - add a blinking circle with red color to serverHealthDiv
        serverStatusCircle = document.createElement('div');
        serverStatusCircle.style.width = '10px';
        serverStatusCircle.style.height = '10px';
        serverStatusCircle.style.backgroundColor = 'red';
        serverStatusCircle.style.borderRadius = '50%';
        serverStatusCircle.style.animation = 'blinker 1s linear infinite';
        serverHealthDiv.appendChild(serverStatusCircle);
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

        // Add a div, in serverHealthDiv, where if I hover over it, shows me text related to server status
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
        serverHealthDiv.appendChild(serverStatusTextDiv);

        config.setServerStatusCircle(serverStatusCircle);
        config.setServerStatusTextDiv(serverStatusTextDiv);

        // Add the hover text
        serverHealthDiv.addEventListener('mouseover', function() {
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
            // Step 1 - Create the parent container
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

            // Step 2.1 - Create the background overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.left = '0';
            overlay.style.top = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';

            // Step 2.2 - Create the dialog container
            const dialog = document.createElement('div');
            dialog.style.position = 'relative';
            dialog.style.zIndex = '1001';
            dialog.style.backgroundColor = 'white';
            dialog.style.padding = '20px';
            dialog.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
            dialog.style.borderRadius = '5px'

            // Step 2.2.1 - Create the dialog content
            const title = document.createElement('h2');
            title.textContent = 'Enter Name';
            dialog.appendChild(title);
            
            // Step 2.2.2 - Create the input elements (First name)
            const input1 = document.createElement('input');
            input1.type = 'text';
            input1.placeholder = 'Enter first name';
            dialog.appendChild(input1);
            
            // Step 2.2.3 - Create the input elements (Second name)
            const input2 = document.createElement('input');
            input2.type = 'text';
            input2.placeholder = 'Enter second name';
            dialog.appendChild(input2);

            // Step 2.2.4 - Add a dropdown with two options - Expert and Non-Expert
            const dropdown = document.createElement('select');
            const option1 = document.createElement('option');
            option1.value = config.USERROLE_EXPERT;
            option1.text = config.USERROLE_EXPERT;
            const option2 = document.createElement('option');
            option2.value = config.USERROLE_NONEXPERT;
            option2.text = config.USERROLE_NONEXPERT;

            dropdown.appendChild(option1);
            dropdown.appendChild(option2);
            dialog.appendChild(dropdown);
            
            // Step 2.2.5 - Create the submit button
            const submitButton = document.createElement('button');
            submitButton.textContent = 'Submit';
            dialog.appendChild(submitButton);

            // Step 3 - Append the dialog and overlay to the parent container
            dialogSuper.appendChild(overlay);
            dialogSuper.appendChild(dialog);
            document.body.appendChild(dialogSuper);
            
            // Step 4 - Some defaults
            input1.value = 'John';
            input2.value = 'Doe';
            option2.selected = true;

            // Step 5 - Handle the submit button click
            submitButton.onclick = function() {
                const userCredFirstName = input1.value;
                const userCredLastName  = input2.value;
                const userCredRole      = dropdown.value;
                console.log('\n - [dialog] Name:', userCredFirstName, userCredLastName, userCredRole);
                if (userCredFirstName === '' || userCredLastName === '' || userCredFirstName === null || userCredLastName === null) {
                    alert('Please enter a valid name');
                    return;
                }else{
                    config.setUserCredFirstName(userCredFirstName);
                    config.setUserCredLastName(userCredLastName);
                    config.setUserCredRole(userCredRole);
                    document.body.removeChild(dialogSuper);
                }
                
            };

        }

        // Show the custom alert dialog on page load
        document.addEventListener('DOMContentLoaded', (event) => {
            showCustomAlert();
        });

    }

    ////////////////////////////////////////////////////////////////////// Step 6 - Add a div on top right to show the server status
    if (1){
        // Step 6.1 - Create a div to show the server status
        const serverHealthDiv = document.createElement('div');
        serverHealthDiv.id = config.serverHealthDivId;
        serverHealthDiv.style.position = 'absolute'; // Change to absolute
        serverHealthDiv.style.top = '3';
        serverHealthDiv.style.right = '3';
        serverHealthDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        serverHealthDiv.style.color = 'white';
        serverHealthDiv.style.padding = '5px';
        serverHealthDiv.style.zIndex = '1000'; // Ensure zIndex is a string
        document.body.appendChild(serverHealthDiv);
        config.setServerHealthDiv(serverHealthDiv);
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

// ------------------------------------- HTML Element (Set 2)
async function createContouringHTML() {

    //////////////////////////////////////////////////////////////////////////// Step 1.0 - Get interactionButtonsDiv and contouringButtonDiv
    const interactionButtonsDiv = document.getElementById(config.interactionButtonsDivId);
    const contouringButtonDiv = document.createElement('div');
    contouringButtonDiv.id = config.contouringButtonDivId;

    const contouringButtonInnerDiv = document.createElement('div');
    contouringButtonInnerDiv.style.display = 'flex';
    contouringButtonInnerDiv.style.flexDirection = 'row';

    ////////////////////////////////////////////////////////////////////////////  Step 2 - Create a button to enable PlanarFreehandContourSegmentationTool
    // Step 2.1 - Create a button
    const contourSegmentationToolButton = document.createElement('button');
    contourSegmentationToolButton.id = config.contourSegmentationToolButtonId;
    contourSegmentationToolButton.title = 'Enable Circle Brush \n (+/- to change brush size)'; // Tooltip text

    // Step 2.2 - Create an image element for the logo
    const logoBrush = document.createElement('img');
    logoBrush.src = './logo-brush.png'; // Replace with the actual path to your logo
    logoBrush.alt = 'Circle Brush';
    logoBrush.style.width = '50px'; // Adjust the size as needed
    logoBrush.style.height = '50px'; // Adjust the size as needed
    logoBrush.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    contourSegmentationToolButton.appendChild(logoBrush);

    // Step 2.3 - Create a text node for the button text
    const buttonText = document.createTextNode('Circle Brush');
    contourSegmentationToolButton.appendChild(buttonText);
    contourSegmentationToolButton.style.fontSize = '10px';

    contourSegmentationToolButton.style.display = 'flex';
    contourSegmentationToolButton.style.flexDirection = 'column';
    contourSegmentationToolButton.style.alignItems = 'center';
    
    ////////////////////////////////////////////////////////////////////////////   Step 3 - Create a button to enable SculptorTool
    // Step 3.1 - Create a button
    const sculptorToolButton = document.createElement('button');
    sculptorToolButton.id = config.sculptorToolButtonId;
    sculptorToolButton.title = 'Enable Circle Eraser \n (+/- to change brush size)';

    // Step 3.2 - Create an image element for the logo
    const logoEraser = document.createElement('img');
    logoEraser.src = './logo-eraser.png'; // Replace with the actual path to your logo
    logoEraser.alt = 'Circle Eraser';
    logoEraser.style.width = '50px'; // Adjust the size as needed
    logoEraser.style.height = '50px'; // Adjust the size as needed
    sculptorToolButton.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    sculptorToolButton.appendChild(logoEraser);

    // Step 3.3 - Create a text node for the button text
    const sculptorButtonText = document.createTextNode('Circle Eraser');
    sculptorToolButton.appendChild(sculptorButtonText);
    sculptorToolButton.style.fontSize = '10px';

    sculptorToolButton.style.display = 'flex';
    sculptorToolButton.style.flexDirection = 'column';
    sculptorToolButton.style.alignItems = 'center';
    
    //////////////////////////////////////////////////////////////////////////// Step 4 - No contouring button
    // Step 4.1 - Create a button
    const windowLevelButton     = document.createElement('button');
    windowLevelButton.id        = config.windowLevelButtonId;
    windowLevelButton.title = 'Enable WindowLevelTool';

    // Step 4.2 - Create an image element for the logo
    const logoWindowLevel = document.createElement('img');
    logoWindowLevel.src = './logo-windowing.png'; // Replace with the actual path to your logo
    logoWindowLevel.alt = 'WindowLevel';
    logoWindowLevel.style.width = '50px'; // Adjust the size as needed
    logoWindowLevel.style.height = '50px'; // Adjust the size as needed
    windowLevelButton.style.marginRight = '5px'; // Optional: Add some space between the logo and the text
    windowLevelButton.appendChild(logoWindowLevel);

    // Step 4.3 - Create a text node for the button text
    const windowLevelButtonText = document.createTextNode('WindowLevel');
    windowLevelButton.appendChild(windowLevelButtonText);
    windowLevelButton.style.fontSize = '10px';

    windowLevelButton.style.display = 'flex';
    windowLevelButton.style.flexDirection = 'column'; 
    windowLevelButton.style.alignItems = 'center';

    
    ////////////////////////////////////////////////////////////////////////////////// Step 5 - AI scribble button

    // Step 5.1 - Create a div
    const editBaseContourViaScribbleDiv = document.createElement('div');
    editBaseContourViaScribbleDiv.style.display = 'flex';
    editBaseContourViaScribbleDiv.style.flexDirection = 'row';
    
    // Step 5.2 - Create a button
    const editBaseContourViaScribbleButton     = document.createElement('button');
    editBaseContourViaScribbleButton.id        = 'editBaseContourViaScribbleButton';
    editBaseContourViaScribbleButton.title     = 'Enable AI-scribble';
    editBaseContourViaScribbleDiv.appendChild(editBaseContourViaScribbleButton);
    
    // Step 5.3 - Create an image element for the logo
    const logoScribble = document.createElement('img');
    logoScribble.src = './logo-scribble.png'; // Replace with the actual path to your logo
    logoScribble.alt = 'AI-Scribble';
    logoScribble.style.width = '50px'; // Adjust the size as needed
    logoScribble.style.height = '50px'; // Adjust the size as needed
    editBaseContourViaScribbleButton.appendChild(logoScribble);

    // Step 5.4 - Create a text node for the button text
    const editBaseContourViaScribbleButtonText = document.createTextNode('AI-Scribble');
    editBaseContourViaScribbleButton.appendChild(editBaseContourViaScribbleButtonText);
    editBaseContourViaScribbleButton.style.fontSize = '10px';

    editBaseContourViaScribbleButton.style.display = 'flex';
    editBaseContourViaScribbleButton.style.flexDirection = 'column';
    editBaseContourViaScribbleButton.style.alignItems = 'center';

    ////////////////////////////////////////////////////////////////////////////////// Step 6 - Add checkboxes for fgd and bgd
    
    // Step 6.1 - Create div(s) for the checkbox(es)
    const scribbleCheckboxDiv = document.createElement('div');
    scribbleCheckboxDiv.style.display = 'flex';
    scribbleCheckboxDiv.style.flexDirection = 'column';
    scribbleCheckboxDiv.style.justifyContent = 'center';
    editBaseContourViaScribbleDiv.appendChild(scribbleCheckboxDiv);

    const fgdChecBoxParentDiv = document.createElement('div');
    fgdChecBoxParentDiv.style.display = 'flex';
    fgdChecBoxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(fgdChecBoxParentDiv);

    const bgdCheckboxParentDiv = document.createElement('div');
    bgdCheckboxParentDiv.style.display = 'flex';
    bgdCheckboxParentDiv.style.flexDirection = 'row';
    scribbleCheckboxDiv.appendChild(bgdCheckboxParentDiv);

    // Step 6.2.1 - Add checkbox for fgd
    const fgdCheckbox = document.createElement('input');
    fgdCheckbox.type = 'checkbox';
    fgdCheckbox.id = 'fgdCheckbox';
    fgdCheckbox.name = 'Foreground Scribble';
    fgdCheckbox.value = 'Foreground Scribble';
    fgdCheckbox.checked = true;
    fgdCheckbox.style.transform = 'scale(1.5)';
    fgdCheckbox.addEventListener('change', function() { // not called with keyboad shortcut, only works with mouse-click!
        if (this.checked){
            bgdCheckbox.checked = false;
            setAnnotationColor(config.COLOR_RGB_FGD);
        }
    });
    fgdChecBoxParentDiv.appendChild(fgdCheckbox);

    // Step 6.2.2 - Add label for fgd
    const fgdLabel = document.createElement('label');
    fgdLabel.htmlFor = 'fgdCheckbox';
    fgdLabel.style.color = config.COLOR_RGB_FGD // 'goldenrod'; // '#DAA520', 'rgb(218, 165, 32)'
    fgdLabel.appendChild(document.createTextNode('Foreground Scribble'));
    fgdChecBoxParentDiv.appendChild(fgdLabel);
    

    // Step 6.3 - Add checkbox for bgd
    const bgdCheckbox = document.createElement('input');
    bgdCheckbox.type = 'checkbox';
    bgdCheckbox.id = 'bgdCheckbox';
    bgdCheckbox.name = 'Background Scribble';
    bgdCheckbox.value = 'Background Scribble';
    bgdCheckbox.checked = false;
    bgdCheckbox.style.transform = 'scale(1.5)';
    bgdCheckbox.addEventListener('change', function() {
        console.log('bgdCheckbox.checked:', this.checked);
        if (this.checked){
            fgdCheckbox.checked = false;
            setAnnotationColor(config.COLOR_RGB_BGD);
        }
    });
    bgdCheckboxParentDiv.appendChild(bgdCheckbox);

    // Step 6.4 - Add label for bgd
    const bgdLabel = document.createElement('label');
    bgdLabel.htmlFor = 'bgdCheckbox';
    bgdLabel.style.color = config.COLOR_RGB_BGD;
    bgdLabel.appendChild(document.createTextNode('Background Scribble'));
    bgdCheckboxParentDiv.appendChild(bgdLabel);

    ////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////// Step 1.99 - Add buttons to contouringButtonDiv
    contouringButtonDiv.appendChild(contouringButtonInnerDiv);
    contouringButtonInnerDiv.appendChild(contourSegmentationToolButton);
    contouringButtonInnerDiv.appendChild(sculptorToolButton);
    contouringButtonInnerDiv.appendChild(windowLevelButton);
    contouringButtonInnerDiv.appendChild(editBaseContourViaScribbleDiv);
    
    // Step 7 - Add contouringButtonDiv to contentDiv
    interactionButtonsDiv.appendChild(contouringButtonDiv); 

    // Step 99 - Set all elements as global
    config.setContourSegmentationToolButton(contourSegmentationToolButton);
    config.setSculptorToolButton(sculptorToolButton);
    config.setWindowLevelButton(windowLevelButton);
    config.setEditBaseContourViaScribbleButton(editBaseContourViaScribbleButton);
    config.setFgdCheckbox(fgdCheckbox);
    config.setBgdCheckbox(bgdCheckbox);
    
    // return {windowLevelButton, contourSegmentationToolButton, sculptorToolButton, editBaseContourViaScribbleButton, fgdCheckbox, bgdCheckbox};

}

function setContouringButtonsLogic(verbose=true){

    // Step 0 - Init
    const toolGroupContours         = cornerstone3DTools.ToolGroupManager.getToolGroup(config.toolGroupIdContours);
    // const toolGroupScribble         = cornerstone3DTools.ToolGroupManager.getToolGroup(toolGroupIdScribble);
    const windowLevelTool           = cornerstone3DTools.WindowLevelTool;
    const planarFreeHandContourTool = cornerstone3DTools.PlanarFreehandContourSegmentationTool;
    const sculptorTool              = cornerstone3DTools.SculptorTool;
    const planarFreehandROITool     = cornerstone3DTools.PlanarFreehandROITool;
    
    // Step 2 - Add event listeners to buttons        
    try{
        [config.windowLevelButton , config.contourSegmentationToolButton, config.sculptorToolButton, config.editBaseContourViaScribbleButton].forEach((buttonHTML, buttonId) => {
            if (buttonHTML === null) return;
            
            buttonHTML.addEventListener('click', async function() {
                if (buttonId === 0) { // config.windowLevelButton 
                    toolGroupContours.setToolActive(windowLevelTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });              
                    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                        toolGroupContours.setToolPassive(config.strBrushCircle);
                        toolGroupContours.setToolPassive(config.strEraserCircle);
                    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);  
                    
                    setButtonBoundaryColor(config.windowLevelButton , true);
                    setButtonBoundaryColor(config.contourSegmentationToolButton, false);
                    setButtonBoundaryColor(config.sculptorToolButton, false);
                    setButtonBoundaryColor(config.editBaseContourViaScribbleButton, false);
                    
                }
                else if (buttonId === 1) { // config.contourSegmentationToolButton
                    
                    // Step 1 - Set tools as active/passive
                    toolGroupContours.setToolPassive(windowLevelTool.toolName); 
                    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                        toolGroupContours.setToolActive(config.strBrushCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });  
                        toolGroupContours.setToolPassive(config.strEraserCircle);
                    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
                        toolGroupContours.setToolActive(planarFreeHandContourTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);
                    
                    // Step 2 - Set active segId and segRepId
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    if (verbose) console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || predSegmentationUIDs: ', config.predSegmentationUIDs);
                    if (config.predSegmentationUIDs != undefined){
                        if (config.predSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.segmentIndex.setActiveSegmentIndex(config.predSegmentationId, 1);
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(config.toolGroupIdContours, config.predSegmentationUIDs[0]);

                            // Step 3 - Set boundary colors 
                            setButtonBoundaryColor(config.windowLevelButton , false);
                            setButtonBoundaryColor(config.contourSegmentationToolButton, true);
                            setButtonBoundaryColor(config.sculptorToolButton, false);
                            setButtonBoundaryColor(config.editBaseContourViaScribbleButton, false);

                        } else {
                            const toastStr = ''
                            updateGUIElementsHelper.showToast('You cannot edit the base prediction (len=0). Make some AI-refinements first! ')
                            setAllContouringToolsPassive();
                        }
                    } else {
                        updateGUIElementsHelper.showToast('You cannot edit the base prediction(=undefined). Make some AI-refinements first!')
                        setAllContouringToolsPassive();
                    }
                }
                else if (buttonId === 2) { // config.sculptorToolButton

                    // Step 1 - Set tools as active/passive
                    toolGroupContours.setToolPassive(windowLevelTool.toolName);
                    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                        toolGroupContours.setToolPassive(config.strBrushCircle);
                        toolGroupContours.setToolActive(config.strEraserCircle, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolActive(sculptorTool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    }
                    toolGroupContours.setToolPassive(planarFreehandROITool.toolName);
                    
                    // Step 2 - Set active segId and segRepId
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    if (verbose) console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || predSegmentationUIDs: ', config.predSegmentationUIDs);
                    if (config.predSegmentationUIDs != undefined){
                        if (config.predSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.segmentIndex.setActiveSegmentIndex(config.predSegmentationId, 1);
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(config.toolGroupIdContours, config.predSegmentationUIDs[0]);

                            // Step 3 - Set boundary colors
                            setButtonBoundaryColor(config.windowLevelButton , false);
                            setButtonBoundaryColor(config.contourSegmentationToolButton, false);
                            setButtonBoundaryColor(config.sculptorToolButton, true);
                            setButtonBoundaryColor(config.editBaseContourViaScribbleButton, false);
                        }
                        else{
                            setAllContouringToolsPassive();
                            updateGUIElementsHelper.showToast('You cannot edit the base prediction (len=0). Make some AI-refinements first! ')
                        }
                    }else{
                        setAllContouringToolsPassive();
                        updateGUIElementsHelper.showToast('You cannot edit the base prediction(=undefined). Make some AI-refinements first!')
                    }
                }
                else if (buttonId === 3) { // config.editBaseContourViaScribbleButton
                    
                    toolGroupContours.setToolPassive(windowLevelTool.toolName);
                    if (config.MODALITY_CONTOURS == config.MODALITY_SEG){
                        toolGroupContours.setToolPassive(config.strBrushCircle);
                        toolGroupContours.setToolPassive(config.strEraserCircle);
                    } else if (config.MODALITY_CONTOURS == config.MODALITY_RTSTRUCT){
                        toolGroupContours.setToolPassive(planarFreeHandContourTool.toolName);
                        toolGroupContours.setToolPassive(sculptorTool.toolName);
                    }
                    toolGroupContours.setToolActive(planarFreehandROITool.toolName, { bindings: [ { mouseButton: cornerstone3DTools.Enums.MouseBindings.Primary, }, ], });
                    
                    const allSegIdsAndUIDs =  cornerstone3DTools.segmentation.state.getAllSegmentationRepresentations();
                    console.log(' - [setContouringButtonsLogic()] allSegIdsAndUIDs: ', allSegIdsAndUIDs, ' || scribbleSegmentationUIDs: ', config.scribbleSegmentationUIDs);
                    if (config.scribbleSegmentationUIDs != undefined){
                        if (config.scribbleSegmentationUIDs.length != 0){
                            cornerstone3DTools.segmentation.activeSegmentation.setActiveSegmentationRepresentation(config.toolGroupIdContours, config.scribbleSegmentationUIDs[0]);
                            if (fgdCheckbox.checked) setAnnotationColor(config.COLOR_RGB_FGD);
                            if (bgdCheckbox.checked) setAnnotationColor(config.COLOR_RGB_BGD);

                            // Step 3 - Set boundary colors
                            setButtonBoundaryColor(config.windowLevelButton , false);
                            setButtonBoundaryColor(config.contourSegmentationToolButton, false);
                            setButtonBoundaryColor(config.sculptorToolButton, false);
                            setButtonBoundaryColor(config.editBaseContourViaScribbleButton, true);
                        } else{
                            updateGUIElementsHelper.showToast('Issue with accessing scribbleSegmentationUIDs: ', config.scribbleSegmentationUIDs)
                            setAllContouringToolsPassive();
                        }
                    }else{
                        updateGUIElementsHelper.showToast('Issue with accessing scribbleSegmentationUIDs: ', config.scribbleSegmentationUIDs)
                        setAllContouringToolsPassive();
                    }
                }
            });
        });
    } catch (error){
        setAllContouringToolsPassive();
        console.log('   -- [setContouringButtonsLogic()] Error: ', error);
    }

}

// ------------------------------------- Other functions

// called in createViewPortsHTML()
async function setThumbnailContainerHeightAndWidth(){
    let thumbnailContainerDiv=config.thumbnailContainerDiv;
    let thumbnailContainerHeight=0.9*window.innerHeight;
    thumbnailContainerDiv.style.height=thumbnailContainerHeight+'px';

    config.thumbnailContainerDiv.style.height = `${config.viewportGridDiv.style.height}px`;
    config.thumbnailContainerDiv.style.width = window.innerWidth * (1-3*config.viewWidthPerc) + 'px';
}

// called in interactive-frontend.js
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

// called in setContouringButtonsLogic()
function setAnnotationColor(rgbColorString){
    // rgbColorString = 'rgb(255,0,0)';
    
    // Step 1 - Get styles
    let styles = cornerstone3DTools.annotation.config.style.getDefaultToolStyles();
    
    // Step 2 - Set the color
    styles.global.color            = rgbColorString;
    styles.global.colorHighlighted = rgbColorString;
    styles.global.colorLocked      = rgbColorString;
    styles.global.colorSelected    = rgbColorString;
    
    // Step 3 - set stype
    cornerstone3DTools.annotation.config.style.setDefaultToolStyles(styles);

}

// called in setContouringButtonsLogic()
function setButtonBoundaryColor(button, shouldSet, color = 'red') {
    if (button instanceof HTMLElement) {
        if (shouldSet) {
            button.style.border = `2px solid ${color}`;
        } else {
            button.style.border = '';
        }
    } else {
        console.error('Provided argument is not a DOM element');
    }
}

// ------------------------------------- Final export
export { createViewPortsHTML, waitForCredentials, createContouringHTML, setContouringButtonsLogic }; // all called in interactive-frontend.js
export {setButtonBoundaryColor, setAnnotationColor}