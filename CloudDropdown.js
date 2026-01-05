class CloudDropdown {
    constructor() {
     
        this.elements = {
            selectElement: document.getElementById('restfulselect'),
            messageElement: document.getElementById('message'),
            input: document.getElementById('restfulselect'),
            otherElement: document.getElementById('otherinput'),
            waiterElement: document.getElementById('waiter'),
            widgetContainer: document.getElementById('widget-container')
        };

        this.init();
    }

    async init() {
        JFCustomWidget.subscribe("ready", async (d) => {
           //console.log(d);
            this.config = this.getWidgetSettings(d.value);
            this.setupEventListeners();
            await this.loadInitialData();
            this.adjustIframeSize();
        });

        JFCustomWidget.subscribe("submit", () => {
            var isvalid = true;
            var thevalue = this.elements.selectElement.value;
            // if they can choose Other and enter a value and they have done so then submit that value 
            if (this.config.othopt === 'Yes enterable value' && this.elements.selectElement.value == this.config.othval && this.elements.otherElement.value.length > 0) {
                thevalue = this.elements.otherElement.value;
            }

            // it looks like the rule is that it works if JF Required = Yes AND there is a placeholder
            // so widget Required is (probably) not required
            //if (this.config.req) { isvalid = (this.elements.selectElement.value.length > 0); }       

            JFCustomWidget.sendSubmit({
                valid: isvalid,
                value: thevalue
            });
        });
    }

    getWidgetSettings(val) {
        const settings = JFCustomWidget.getWidgetSettings();
        //console.log(settings);
        //            req: settings.req || 'No',
        return {
            prevval: val || '',
            url: settings.ep || ' ',
            ahdr: settings.authhdr ||'',
            keypath: settings.kpath || '',
            jquery: settings.kquery || '',
            ddvalue: settings.Value || '',
            ddtext: settings.DisplayText || 'name',
            encit: settings.enc || 'No',
            showval: settings.showval || 'No',
            vallab: settings.vallab || '',
            hint: settings.hint || '',
            isreq: settings.req || 'No',
            othopt: settings.otheropt || 'No',
            othtext: settings.othertext || 'Other',
            othval: settings.othervalue || 'Other'
        };
    }

    setupEventListeners() {
        this.elements.selectElement.addEventListener('input', this.handleInput.bind(this));
    }

    async loadInitialData() {
        // Fetch data from a JSON API and populate the select dropdown

        try {
            //const ddvalue2 = JFCustomWidget.getWidgetSetting('Value') || 'Value';
            //console.log(ddvalue2);
            //const ddvalue = JFCustomWidget.getWidgetSetting('Value') || 'Value';
            //const ddtext = JFCustomWidget.getWidgetSetting('Text') || 'Text';

            //const url = 'https://sailevent.net/restapi/v1/countries/northern%20europe';
            //const ddvalue = 'Value';
            //const ddtext = 'Text';

            //const url = 'https://api.restful-api.dev/objects';
            //const ddvalue = 'id';
            //const ddtext = 'name';

             //const url = 'https://api.coinbase.com/v2/currencies';
            //const ddvalue = 'id';
            //const ddtext = 'name';

            //const url = 'https://softwium.com/api/books';
            //const ddvalue = 'isbn';
            //const ddtext = 'title';

             //const url = 'https://stapi.co/api/v2/rest/spacecraft/search'; // FAILS
            //const ddvalue = 'uid';
            //const ddtext = 'name';
            
            //  const url = 'https://www.gov.uk/bank-holidays.json

            //console.log(url);
            //console.log(ddvalue);
            //console.log(ddtext);

            //const url = JFCustomWidget.getWidgetSetting('URL') || ' ' ;
            //const ddvalue = JFCustomWidget.getWidgetSetting('Value') || 'Value';
            //const ddtext = JFCustomWidget.getWidgetSetting('DisplayText') || 'Text';

            if (typeof fetch === "function") {
                if ((this.config.url || ' ').length > 10 ) {
                    // Fetch JSON data from the URL
                    // weirdly specifying content type triggers CORS which we can't handle 

                    // if there is a basic authorization header and the credentials are not base64 encode, encode them
                    // else use as is
                    const headers = new Headers();
                    let authhdr = this.config.ahdr.trim();
                    if (authhdr.length > 0) {
                        const brkar = authhdr.split(/\s+/);
                        if (brkar.length >= 2) {
                            if (brkar[0].toLowerCase() == 'basic') {
                                var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
                                if (!base64regex.test(brkar[1].trim())) { authhdr = brkar[0] + ' ' + btoa(brkar[1].trim()) ;}
                            }
                        }
                        headers.append('Authorization', `${authhdr}`);
                    }

                    // URL encode if that's what they want
                    const urlenc = this.config.encit === 'Yes' ? encodeURI(this.config.url.trim()) : this.config.url.trim();
                    this.elements.waiterElement.style.display = 'block';

                    fetch(urlenc, {
                        method: 'GET',
                        headers: headers
                    })
                        .then(response => {
                            // Check if the fetch was successful
                            if (!response.ok) {
                                // return Promise.reject(response);  found on SO What does it do?
                                throw new Error(`HTTP error. Status: ${response.status}`);
                            }
                         return response.json(); // Parse the JSON from the response
                        })
                        .then (data => {

                            this.elements.waiterElement.style.display = 'none';

                            var valvalue;
                            var valtext;
                            var ahint = this.config.hint;
                            var jarray = data;

                            // Look for an array in the parsed JSON.

                            // If they haven't specified a path then it may be the first and only item
                            // or it may be the value of a key
                            // but if there is a path, seperate it into its keys and work our way down them

                            if (Object.prototype.toString.call(jarray) != '[object Array]') {
                                // not just an array so do we have a path or query?
                                if ((this.config.keypath.length === 0) && (this.config.jquery.length === 0)) {
                                    // no path or query so just search down the JSON looking for an array
                                    for (const [key, value] of Object.entries(data)) {
                                        if (Object.prototype.toString.call(value) == '[object Array]') {
                                            jarray = value;
                                            break;
                                        }
                                    }
                                }
                                else {
                                    // we have a path or a query. Which is it?
                                    if (this.config.jquery.length != 0) {
                                        // we have a query

                                        // run it
                                        jarray = jsonata(this.config.jquery).evaluate(data);
                                    }
                                    else {
                                        // we have a path

                                        // deal with dots in key names (however unlikely, if it can happen it will happen)
                                        var path = this.config.keypath.replaceAll('\\.', String.fromCharCode(30));
                                        // drill down to end of path
                                        path.split(".").forEach(key => {
                                            jarray = jarray[key.replaceAll(String.fromCharCode(30), '')];
                                        })
                                    }
                                }
                            }

                            // Now, do we have an array?
                            if (Object.prototype.toString.call(jarray) != '[object Array]') {
                                throw new Error(`Unable to interpret JSON from this source.`);
                            }
                            // Yep, good to go...

                            // Clear existing options
                            this.elements.selectElement.innerHTML = '';

                            // If they've specified a place holder, add it to the list at position 0
                            if (ahint != '') {
                                const opthint = document.createElement('option');
                                opthint.textContent = ahint;
                                opthint.setAttribute('disabled', 'disabled');
                                opthint.setAttribute('selected', 'selected');
                                opthint.setAttribute('hidden', 'hidden');
                                //if (this.config.isreq == 'Yes') { opthint.value = '';}
                                //else { opthint.value = ' '; }
                                opthint.value = ''; // if value is '', Jotform sets value to URL!
                                this.elements.selectElement.appendChild(opthint);
                            }

                            var prevselected = false;

                             // Populate the dropdown with options from the JSON array
                            jarray.forEach(item => {
                                const option = document.createElement('option');

                                // if the text to display exists, put it in the option
                                if (this.config.ddtext in item) {
                                    valtext = item[this.config.ddtext];
                                    option.textContent = valtext; // a display name from the JSON

                                    // if they have specified a value and it exists, put it in the option
                                    // if they haven't specified a value then use the text as the value
                                    if (this.config.ddvalue != '') {
                                        if (this.config.ddvalue in item) {
                                            valvalue = item[this.config.ddvalue];
                                            option.value = valvalue; // a returned value from the JSON
                                        }
                                        else {
                                            option.textContent = '\'' + this.config.ddvalue + '\' not found in JSON.';
                                            option.value = '';}
                                        }
                                    else {
                                       option.value = valtext; // return text as value
                                    }
                                } else {
                                    option.textContent = '\'' + this.config.ddtext + '\' not found in JSON.';
                                    option.value = '';
                                }

                                    // if JF gave us an existing value then presumably we are being edited
                                    // so set the corresponding option to selected
                                if (option.value == this.config.prevval) {
                                    option.selected = true;
                                    prevselected = true; }

                                this.elements.selectElement.appendChild(option);
                            });

                            // 'Other' option
                            if (this.config.othopt != 'No') {
                                const optoth = document.createElement('option');
                                optoth.textContent = this.config.othtext;
                                optoth.value = this.config.othval;
                                console.log(this.config.prevval);

                                if (this.config.prevval.length > 0) {
                                     // JF gave us an existing value so presumably we are being edited
                                    //  if the existing value is the other value then select Other
                                    if (this.config.prevval == this.config.othval) {
                                        optoth.selected = true;
                                        // but if the it happens that the Other value is enterable
                                        // then display the textbox with the original value in it
                                        if (this.config.othopt === 'Yes enterable value') {
                                            this.elements.otherElement.style.display = 'block';
                                            this.elements.otherElement.value = this.config.prevval;
                                            this.elements.messageElement.style.display = 'none';
                                            this.adjustIframeSize();
                                        }
                                    }
                                    else {
                                        // if the Other value is enterable and we haven't selected an option yet
                                        // then we assume that we are looking at an entered Other value
                                        // (may not be true if the original value is no longer in the list but ho-hum...)
                                        // so we still select Other and display the textbox with the original value in it
                                        // (actually that works rather well if the original value is no longer in the list!)
                                        if (this.config.othopt === 'Yes enterable value' && !prevselected) {
                                            optoth.selected = true;
                                            this.elements.otherElement.style.display = 'block';
                                            this.elements.otherElement.value = this.config.prevval;
                                            this.elements.messageElement.style.display = 'none';
                                            this.adjustIframeSize();
                                        }
                                    }
                                }

                                this.elements.selectElement.appendChild(optoth);
                            }
                        })
                .catch(error => {
                             // Handle errors
                            this.elements.waiterElement.style.display = 'none';
                            if (this.config.url == null) { this.elements.messageElement.textContent = 'API URL not in widget settings.'; }
                            else {
                                console.error('Error fetching JSON:', error.message);
                                this.elements.messageElement.textContent = 'Failed to get list. Details are on your browser console.';
                            }
                            this.elements.messageElement.style.display = 'block';
                            this.adjustIframeSize();
                        });
                }
                else {
                    this.elements.waiterElement.style.display = 'none';
                    this.elements.messageElement.textContent = 'API URL not in widget settings.';
                    this.elements.messageElement.style.display = 'block';
                    this.adjustIframeSize();
                }
            }
            else {
                //JFCustomWidget.replaceWidget('control_textbox');
                this.elements.waiterElement.style.display = 'none';
                this.elements.messageElement.textContent = 'This widget requires a modern browser.';
                this.elements.messageElement.style.display = 'block';
                this.adjustIframeSize();
            }
        }
        catch (error) {
            this.elements.waiterElement.style.display = 'none';
            console.error('Error fetching or populating data:', error);
            this.elements.messageElement.textContent = 'Error populating drop down list. ' + error;
            this.elements.messageElement.style.display = 'block';
            this.adjustIframeSize();
            }
    }


    async handleInput(event) {
        if (this.config.othopt === 'Yes enterable value') {
            if (event.target.value == this.config.othval) {
                this.elements.otherElement.style.display = 'block';
                this.elements.otherElement.focus();
                this.elements.messageElement.style.display = 'none';
                this.adjustIframeSize();
            }
            else {
                this.elements.otherElement.style.display = 'none';
                this.elements.messageElement.style.display = 'none';
                this.adjustIframeSize();
            }
        }
        else { 
        if (this.config.showval === 'Yes') {
            this.elements.messageElement.textContent = this.config.vallab === undefined ? event.target.value : this.config.vallab + ' ' + event.target.value;
            this.elements.messageElement.style.display = 'block';
            this.elements.otherElement.style.display = 'none';
            this.adjustIframeSize();
        }
    }
    }

    
    async dojsonata(pjson, pquery) {
    return await jsonata(pquery).evaluate(pjson);
    }

    showMessage(message) {
        this.elements.messageElement.textContent = message;
        this.elements.messageElement.style.display = 'block';
        this.adjustIframeSize();
    }


    adjustIframeSize() {
        const height = document.getElementById("widget-container").offsetHeight
        const width = document.getElementById("widget-container").offsetWidth; //                 width: width,
            JFCustomWidget.requestFrameResize({
                height: height
            });
    }
    
}

// Initialize the widget
new CloudDropdown();




