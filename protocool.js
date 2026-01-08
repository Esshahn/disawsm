




    load_charset(filename)
    { 
        let array_buffer = await this.load({url:filename,type:'binary'});
        let charset = this._convert_charset(array_buffer);
        this._create_charset(charset,this.computer.charset_color);        
    }

    _convert_charset(array_buffer)
    {
        let charset_bytes = [];
        let charset = []; 
        var byte_array = new Uint8Array(array_buffer);
        var line_counter = 0;
        for (var i = 0; i < byte_array.byteLength; i++) 
        {
            let binary = ("0000000" + byte_array[i].toString(2)).slice(-8);
            charset_bytes.push(binary);

            line_counter ++;
            if (line_counter == 8)
            {
                charset.push(charset_bytes);
                line_counter = 0;
                charset_bytes = [];
            }
        }
        return charset;
    }

    _create_charset(charset,color)
    {
        
        this.charset = [];
        color = this._check_color(color);

        let char;
        for (let chars = 0; chars < charset.length; chars++)
        {

            char = document.createElement('canvas');
            char.id = chars;
            char.width = 8;
            char.height = 8;
            char.ctx = char.getContext('2d');
            char.ctx.fillStyle = this.computer.colors[color];
            
            for(let y=0; y<8; y++)
            {
                for(let x=0; x<8; x++)
                {
                    char.ctx.fillRect(x, y, charset[chars][y][x], charset[chars][y][x]);
                }
            }
            
            this.charset.push(char);
        }
        
    }

   



